import { bootstrap } from "#base";
import { startServer } from "#server";
import { apiManager, healthChecker, errorRecoveryManager, rateLimiter } from "#functions";

// Initialize API manager with Warframe API
apiManager.registerApi('warframe', {
    baseUrl: 'https://api.warframestat.us/pc',
    fallbackUrls: ['https://api.warframestat.us/pc'],
    timeout: 10000,
    retries: 3
});

// Start the bot
await bootstrap({ 
    meta: import.meta,
    beforeLoad: (client) => {
        // Initialize security and monitoring systems
        errorRecoveryManager.initialize(client);
        healthChecker.initialize(client);
        
        // Set up rate limiter cleanup interval
        rateLimiter.startCleanupInterval();
    },
    whenReady: (client) => {
        // Start the web server
        startServer(client);
        
        // Start health checks
        healthChecker.startPeriodicChecks();
    }
});