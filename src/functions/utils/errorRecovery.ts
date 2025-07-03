import { logger } from "#settings";
import { Client } from "discord.js";

interface RetryConfig {
    maxRetries: number;
    baseDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
    retryCondition?: (error: Error) => boolean;
}

interface RecoveryAction {
    name: string;
    action: () => Promise<void>;
    condition: (error: Error) => boolean;
    priority: number;
}

class ErrorRecoveryManager {
    private client: Client | null = null;
    private recoveryActions: RecoveryAction[] = [];
    private isRecovering = false;
    private recoveryHistory: Array<{ timestamp: number; error: string; action: string; success: boolean }> = [];

    /**
     * Initialize error recovery with Discord client
     */
    initialize(client: Client): void {
        this.client = client;
        this.setupDefaultRecoveryActions();
        this.setupGlobalErrorHandlers();
    }

    /**
     * Setup default recovery actions
     */
    private setupDefaultRecoveryActions(): void {
        // Discord connection recovery
        this.addRecoveryAction({
            name: 'discord_reconnect',
            action: async () => {
                if (this.client && !this.client.isReady()) {
                    logger.log('Attempting Discord reconnection...');
                    await this.client.destroy();
                    await new Promise(resolve => setTimeout(resolve, 5000));
                    await this.client.login(process.env.BOT_TOKEN);
                }
            },
            condition: (error) => {
                return error.message.includes('WebSocket') || 
                       error.message.includes('connection') ||
                       error.message.includes('ECONNRESET');
            },
            priority: 1
        });

        // Memory cleanup recovery
        this.addRecoveryAction({
            name: 'memory_cleanup',
            action: async () => {
                logger.log('Performing memory cleanup...');
                if (global.gc) {
                    global.gc();
                }
                // Clear caches if available
                if (this.client) {
                    this.client.users.cache.clear();
                    // Keep only essential guild data
                    this.client.guilds.cache.forEach(guild => {
                        guild.members.cache.clear();
                        guild.channels.cache.clear();
                    });
                }
            },
            condition: (error) => {
                return error.message.includes('memory') || 
                       error.message.includes('heap') ||
                       process.memoryUsage().heapUsed / process.memoryUsage().heapTotal > 0.9;
            },
            priority: 2
        });

        // File system recovery
        this.addRecoveryAction({
            name: 'file_system_recovery',
            action: async () => {
                logger.log('Attempting file system recovery...');
                // Recreate necessary directories
                const fs = await import('fs/promises');
                const path = await import('path');
                
                const dirs = ['logs', 'temp', 'cache'];
                for (const dir of dirs) {
                    const dirPath = path.join(process.cwd(), dir);
                    try {
                        await fs.access(dirPath);
                    } catch {
                        await fs.mkdir(dirPath, { recursive: true });
                    }
                }
            },
            condition: (error) => {
                return error.message.includes('ENOENT') || 
                       error.message.includes('EACCES') ||
                       error.message.includes('file system');
            },
            priority: 3
        });
    }

    /**
     * Setup global error handlers
     */
    private setupGlobalErrorHandlers(): void {
        // Handle uncaught exceptions
        process.on('uncaughtException', (error) => {
            logger.error('Uncaught Exception:', error);
            this.handleError(error, 'uncaughtException');
        });

        // Handle unhandled promise rejections
        process.on('unhandledRejection', (reason) => {
            const error = reason instanceof Error ? reason : new Error(String(reason));
            logger.error('Unhandled Rejection:', error);
            this.handleError(error, 'unhandledRejection');
        });

        // Handle Discord client errors
        if (this.client) {
            this.client.on('error', (error) => {
                logger.error('Discord Client Error:', error);
                this.handleError(error, 'discordClient');
            });

            this.client.on('disconnect', () => {
                logger.warn('Discord client disconnected');
                this.handleError(new Error('Discord client disconnected'), 'discordDisconnect');
            });
        }
    }

    /**
     * Add a recovery action
     */
    addRecoveryAction(action: RecoveryAction): void {
        this.recoveryActions.push(action);
        this.recoveryActions.sort((a, b) => a.priority - b.priority);
    }

    /**
     * Handle an error with automatic recovery
     */
    async handleError(error: Error, context: string = 'unknown'): Promise<void> {
        if (this.isRecovering) {
            logger.warn('Recovery already in progress, queuing error handling');
            return;
        }

        this.isRecovering = true;
        logger.error(`Error in context '${context}':`, error);

        try {
            // Find applicable recovery actions
            const applicableActions = this.recoveryActions.filter(action => 
                action.condition(error)
            );

            if (applicableActions.length === 0) {
                logger.warn('No recovery actions found for error:', error.message);
                return;
            }

            // Execute recovery actions in priority order
            for (const action of applicableActions) {
                try {
                    logger.log(`Executing recovery action: ${action.name}`);
                    await action.action();
                    
                    this.recordRecovery(error.message, action.name, true);
                    logger.log(`Recovery action '${action.name}' completed successfully`);
                } catch (recoveryError) {
                    this.recordRecovery(error.message, action.name, false);
                    logger.error(`Recovery action '${action.name}' failed:`, recoveryError);
                }
            }
        } finally {
            this.isRecovering = false;
        }
    }

    /**
     * Retry a function with exponential backoff
     */
    async retryWithBackoff<T>(
        fn: () => Promise<T>,
        config: Partial<RetryConfig> = {}
    ): Promise<T> {
        const {
            maxRetries = 3,
            baseDelay = 1000,
            maxDelay = 30000,
            backoffMultiplier = 2,
            retryCondition = () => true
        } = config;

        let lastError: Error;
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                lastError = error as Error;
                
                if (attempt === maxRetries || !retryCondition(lastError)) {
                    throw lastError;
                }
                
                const delay = Math.min(
                    baseDelay * Math.pow(backoffMultiplier, attempt),
                    maxDelay
                );
                
                logger.warn(`Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, lastError.message);
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
        
        throw lastError!;
    }

    /**
     * Record recovery attempt
     */
    private recordRecovery(error: string, action: string, success: boolean): void {
        this.recoveryHistory.push({
            timestamp: Date.now(),
            error,
            action,
            success
        });
        
        // Keep only last 100 recovery attempts
        if (this.recoveryHistory.length > 100) {
            this.recoveryHistory = this.recoveryHistory.slice(-100);
        }
    }

    /**
     * Get recovery statistics
     */
    getRecoveryStats(): {
        totalAttempts: number;
        successfulAttempts: number;
        failedAttempts: number;
        recentAttempts: Array<{ timestamp: number; error: string; action: string; success: boolean }>;
    } {
        const successful = this.recoveryHistory.filter(r => r.success).length;
        const failed = this.recoveryHistory.filter(r => !r.success).length;
        
        return {
            totalAttempts: this.recoveryHistory.length,
            successfulAttempts: successful,
            failedAttempts: failed,
            recentAttempts: this.recoveryHistory.slice(-10)
        };
    }

    /**
     * Clear recovery history
     */
    clearHistory(): void {
        this.recoveryHistory = [];
    }
}

// Create singleton instance
export const errorRecoveryManager = new ErrorRecoveryManager();