import { Client } from "discord.js";
import { logger } from "#settings";
import { apiManager } from "./apiManager.js";
import fs from "fs/promises";
import path from "path";

interface HealthCheckResult {
    name: string;
    status: 'healthy' | 'degraded' | 'unhealthy';
    responseTime?: number;
    error?: string;
    details?: any;
}

interface SystemHealth {
    overall: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: number;
    checks: HealthCheckResult[];
    uptime: number;
}

class HealthChecker {
    private client: Client | null = null;
    private lastCheck: SystemHealth | null = null;
    private checkInterval: NodeJS.Timeout | null = null;

    /**
     * Initialize health checker with Discord client
     */
    initialize(client: Client): void {
        this.client = client;
        
        // Start periodic health checks every 5 minutes
        this.checkInterval = setInterval(() => {
            this.performHealthCheck().catch(error => {
                logger.error('Health check failed:', error);
            });
        }, 5 * 60 * 1000);
        
        // Perform initial health check
        setTimeout(() => {
            this.performHealthCheck().catch(error => {
                logger.error('Initial health check failed:', error);
            });
        }, 10000); // Wait 10 seconds after startup
    }

    /**
     * Perform comprehensive health check
     */
    async performHealthCheck(): Promise<SystemHealth> {
        const checks: HealthCheckResult[] = [];

        // Check Discord connection
        checks.push(await this.checkDiscordConnection());
        
        // Check file system access
        checks.push(await this.checkFileSystem());
        
        // Check external APIs
        checks.push(await this.checkExternalApis());
        
        // Check memory usage
        checks.push(await this.checkMemoryUsage());
        
        // Check disk space
        checks.push(await this.checkDiskSpace());

        // Determine overall health
        const unhealthyCount = checks.filter(c => c.status === 'unhealthy').length;
        const degradedCount = checks.filter(c => c.status === 'degraded').length;
        
        let overall: 'healthy' | 'degraded' | 'unhealthy';
        if (unhealthyCount > 0) {
            overall = 'unhealthy';
        } else if (degradedCount > 0) {
            overall = 'degraded';
        } else {
            overall = 'healthy';
        }

        const result: SystemHealth = {
            overall,
            timestamp: Date.now(),
            checks,
            uptime: process.uptime()
        };

        this.lastCheck = result;
        
        // Log health status changes
        if (overall !== 'healthy') {
            logger.warn(`System health: ${overall}`, { checks: checks.filter(c => c.status !== 'healthy') });
        }

        return result;
    }

    /**
     * Check Discord connection health
     */
    private async checkDiscordConnection(): Promise<HealthCheckResult> {
        const startTime = Date.now();
        
        try {
            if (!this.client || !this.client.isReady()) {
                return {
                    name: 'discord_connection',
                    status: 'unhealthy',
                    error: 'Discord client not ready'
                };
            }

            const ping = this.client.ws.ping;
            const responseTime = Date.now() - startTime;
            
            let status: 'healthy' | 'degraded' | 'unhealthy';
            if (ping < 0) {
                status = 'unhealthy';
            } else if (ping > 500) {
                status = 'degraded';
            } else {
                status = 'healthy';
            }

            return {
                name: 'discord_connection',
                status,
                responseTime,
                details: {
                    ping,
                    guilds: this.client.guilds.cache.size,
                    users: this.client.users.cache.size
                }
            };
        } catch (error) {
            return {
                name: 'discord_connection',
                status: 'unhealthy',
                error: String(error),
                responseTime: Date.now() - startTime
            };
        }
    }

    /**
     * Check file system access
     */
    private async checkFileSystem(): Promise<HealthCheckResult> {
        const startTime = Date.now();
        
        try {
            const testFile = path.join(process.cwd(), '.health-check-test');
            const testData = 'health-check-' + Date.now();
            
            // Test write
            await fs.writeFile(testFile, testData);
            
            // Test read
            const readData = await fs.readFile(testFile, 'utf-8');
            
            // Test delete
            await fs.unlink(testFile);
            
            if (readData !== testData) {
                throw new Error('File content mismatch');
            }

            return {
                name: 'file_system',
                status: 'healthy',
                responseTime: Date.now() - startTime
            };
        } catch (error) {
            return {
                name: 'file_system',
                status: 'unhealthy',
                error: String(error),
                responseTime: Date.now() - startTime
            };
        }
    }

    /**
     * Check external APIs health
     */
    private async checkExternalApis(): Promise<HealthCheckResult> {
        const startTime = Date.now();
        
        try {
            const apiHealth = apiManager.getHealthStatus();
            
            let hasUnhealthy = false;
            let hasDegraded = false;
            
            for (const [, apiStatus] of Object.entries(apiHealth)) {
                for (const endpoint of (apiStatus as any).endpoints) {
                    if (endpoint.isOpen) {
                        hasUnhealthy = true;
                    } else if (endpoint.failures > 0) {
                        hasDegraded = true;
                    }
                }
            }
            
            let status: 'healthy' | 'degraded' | 'unhealthy';
            if (hasUnhealthy) {
                status = 'unhealthy';
            } else if (hasDegraded) {
                status = 'degraded';
            } else {
                status = 'healthy';
            }

            return {
                name: 'external_apis',
                status,
                responseTime: Date.now() - startTime,
                details: apiHealth
            };
        } catch (error) {
            return {
                name: 'external_apis',
                status: 'unhealthy',
                error: String(error),
                responseTime: Date.now() - startTime
            };
        }
    }

    /**
     * Check memory usage
     */
    private async checkMemoryUsage(): Promise<HealthCheckResult> {
        const startTime = Date.now();
        
        try {
            const memUsage = process.memoryUsage();
            const totalMem = memUsage.heapTotal;
            const usedMem = memUsage.heapUsed;
            const usagePercent = (usedMem / totalMem) * 100;
            
            let status: 'healthy' | 'degraded' | 'unhealthy';
            if (usagePercent > 90) {
                status = 'unhealthy';
            } else if (usagePercent > 75) {
                status = 'degraded';
            } else {
                status = 'healthy';
            }

            return {
                name: 'memory_usage',
                status,
                responseTime: Date.now() - startTime,
                details: {
                    usagePercent: Math.round(usagePercent * 100) / 100,
                    heapUsed: Math.round(usedMem / 1024 / 1024 * 100) / 100, // MB
                    heapTotal: Math.round(totalMem / 1024 / 1024 * 100) / 100, // MB
                    external: Math.round(memUsage.external / 1024 / 1024 * 100) / 100 // MB
                }
            };
        } catch (error) {
            return {
                name: 'memory_usage',
                status: 'unhealthy',
                error: String(error),
                responseTime: Date.now() - startTime
            };
        }
    }

    /**
     * Check disk space
     */
    private async checkDiskSpace(): Promise<HealthCheckResult> {
        const startTime = Date.now();
        
        try {
            // Note: Getting actual disk space is platform-specific
            // This is a simplified check
            return {
                name: 'disk_space',
                status: 'healthy',
                responseTime: Date.now() - startTime,
                details: {
                    note: 'Simplified check - consider implementing platform-specific disk space monitoring'
                }
            };
        } catch (error) {
            return {
                name: 'disk_space',
                status: 'unhealthy',
                error: String(error),
                responseTime: Date.now() - startTime
            };
        }
    }

    /**
     * Get last health check result
     */
    getLastHealthCheck(): SystemHealth | null {
        return this.lastCheck;
    }

    /**
     * Get current health status (performs check if none exists)
     */
    async getCurrentHealth(): Promise<SystemHealth> {
        if (!this.lastCheck || Date.now() - this.lastCheck.timestamp > 5 * 60 * 1000) {
            return await this.performHealthCheck();
        }
        return this.lastCheck;
    }

    /**
     * Start periodic health checks
     */
    startPeriodicChecks(intervalMs: number = 5 * 60 * 1000): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
        }
        
        this.checkInterval = setInterval(() => {
            this.performHealthCheck().catch(error => {
                logger.error('Periodic health check failed:', error);
            });
        }, intervalMs);
    }

    /**
     * Stop health checking
     */
    stop(): void {
        if (this.checkInterval) {
            clearInterval(this.checkInterval);
            this.checkInterval = null;
        }
    }
}

// Create singleton instance
export const healthChecker = new HealthChecker();