import { logger } from "#settings";

interface ApiEndpoint {
    url: string;
    priority: number;
    timeout?: number;
    retries?: number;
}

interface ApiConfig {
    baseUrl: string;
    fallbackUrls?: string[];
    timeout?: number;
    retries?: number;
    circuitBreakerThreshold?: number;
    circuitBreakerResetTime?: number;
}

interface InternalApiConfig {
    name: string;
    endpoints: ApiEndpoint[];
    defaultTimeout: number;
    defaultRetries: number;
    circuitBreakerThreshold: number;
    circuitBreakerResetTime: number;
}

interface CircuitBreakerState {
    failures: number;
    lastFailure: number;
    isOpen: boolean;
}

class ApiManager {
    private configs = new Map<string, InternalApiConfig>();
    private circuitBreakers = new Map<string, CircuitBreakerState>();
    private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();

    /**
     * Register an API configuration
     */
    registerApi(name: string, config: ApiConfig): void {
        const endpoints: ApiEndpoint[] = [
            { url: config.baseUrl, priority: 1, timeout: config.timeout, retries: config.retries }
        ];
        
        // Add fallback URLs if provided
        if (config.fallbackUrls) {
            config.fallbackUrls.forEach((url, index) => {
                endpoints.push({ url, priority: index + 2, timeout: config.timeout, retries: config.retries });
            });
        }
        
        const apiConfig: InternalApiConfig = {
            name,
            endpoints,
            defaultTimeout: config.timeout || 10000,
            defaultRetries: config.retries || 3,
            circuitBreakerThreshold: config.circuitBreakerThreshold || 5,
            circuitBreakerResetTime: config.circuitBreakerResetTime || 60000
        };
        
        this.configs.set(name, apiConfig);
        
        // Initialize circuit breaker for each endpoint
        endpoints.forEach(endpoint => {
            const key = `${name}:${endpoint.url}`;
            this.circuitBreakers.set(key, {
                failures: 0,
                lastFailure: 0,
                isOpen: false
            });
        });
    }

    /**
     * Make an API request with automatic fallback and circuit breaker
     */
    async request(apiName: string, path: string = '', options: RequestInit = {}, cacheTtl: number = 0): Promise<any> {
        const config = this.configs.get(apiName);
        if (!config) {
            throw new Error(`API configuration not found: ${apiName}`);
        }

        const cacheKey = `${apiName}:${path}`;
        
        // Check cache first
        if (cacheTtl > 0) {
            const cached = this.cache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < cached.ttl) {
                return cached.data;
            }
        }

        let lastError: Error | null = null;
        
        // Try each endpoint in priority order
        for (const endpoint of config.endpoints) {
            const circuitKey = `${apiName}:${endpoint.url}`;
            const circuitState = this.circuitBreakers.get(circuitKey)!;
            
            // Check circuit breaker
            if (this.isCircuitOpen(circuitState, config)) {
                logger.warn(`Circuit breaker open for ${endpoint.url}, skipping`);
                continue;
            }

            try {
                const result = await this.makeRequest(endpoint, path, options, config);
                
                // Reset circuit breaker on success
                this.resetCircuitBreaker(circuitKey);
                
                // Cache result if TTL specified
                if (cacheTtl > 0) {
                    this.cache.set(cacheKey, {
                        data: result,
                        timestamp: Date.now(),
                        ttl: cacheTtl
                    });
                }
                
                return result;
            } catch (error) {
                lastError = error as Error;
                this.recordFailure(circuitKey, config);
                logger.warn(`API request failed for ${endpoint.url}: ${error}`);
                continue;
            }
        }
        
        // If we have cached data, return it as fallback
        const cached = this.cache.get(cacheKey);
        if (cached) {
            logger.warn(`All endpoints failed for ${apiName}, returning cached data`);
            return cached.data;
        }
        
        throw lastError || new Error(`All endpoints failed for API: ${apiName}`);
    }

    /**
     * Make a single request to an endpoint
     */
    private async makeRequest(endpoint: ApiEndpoint, path: string, options: RequestInit, config: InternalApiConfig): Promise<any> {
        const url = `${endpoint.url}${path}`;
        const timeout = endpoint.timeout || config.defaultTimeout;
        const retries = endpoint.retries || config.defaultRetries;
        
        let lastError: Error | null = null;
        
        for (let attempt = 0; attempt <= retries; attempt++) {
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), timeout);
                
                const response = await fetch(url, {
                    ...options,
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                return await response.json();
            } catch (error) {
                lastError = error as Error;
                
                if (attempt < retries) {
                    // Exponential backoff
                    const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError;
    }

    /**
     * Check if circuit breaker is open
     */
    private isCircuitOpen(state: CircuitBreakerState, config: InternalApiConfig): boolean {
        if (!state.isOpen) return false;
        
        // Check if reset time has passed
        if (Date.now() - state.lastFailure > config.circuitBreakerResetTime) {
            state.isOpen = false;
            state.failures = 0;
            return false;
        }
        
        return true;
    }

    /**
     * Record a failure and potentially open circuit breaker
     */
    private recordFailure(circuitKey: string, config: InternalApiConfig): void {
        const state = this.circuitBreakers.get(circuitKey)!;
        state.failures++;
        state.lastFailure = Date.now();
        
        if (state.failures >= config.circuitBreakerThreshold) {
            state.isOpen = true;
            logger.warn(`Circuit breaker opened for ${circuitKey}`);
        }
    }

    /**
     * Reset circuit breaker on successful request
     */
    private resetCircuitBreaker(circuitKey: string): void {
        const state = this.circuitBreakers.get(circuitKey)!;
        state.failures = 0;
        state.isOpen = false;
    }

    /**
     * Get health status of all registered APIs
     */
    getHealthStatus(): Record<string, any> {
        const status: Record<string, any> = {};
        
        for (const [apiName, config] of this.configs.entries()) {
            status[apiName] = {
                endpoints: config.endpoints.map((endpoint: ApiEndpoint) => {
                    const circuitKey = `${apiName}:${endpoint.url}`;
                    const state = this.circuitBreakers.get(circuitKey)!;
                    return {
                        url: endpoint.url,
                        priority: endpoint.priority,
                        failures: state.failures,
                        isOpen: state.isOpen,
                        lastFailure: state.lastFailure
                    };
                })
            };
        }
        
        return status;
    }

    /**
     * Clear cache for specific API or all APIs
     */
    clearCache(apiName?: string): void {
        if (apiName) {
            for (const key of this.cache.keys()) {
                if (key.startsWith(`${apiName}:`)) {
                    this.cache.delete(key);
                }
            }
        } else {
            this.cache.clear();
        }
    }
    
    /**
     * Get cache statistics
     */
    getCacheStats(): { size: number; entries: string[] } {
        return {
            size: this.cache.size,
            entries: Array.from(this.cache.keys())
        };
    }
}

// Export singleton instance
export const apiManager = new ApiManager();