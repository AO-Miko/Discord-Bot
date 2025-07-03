import { createEvent } from "#base";
import { configManager } from "#functions";
import { logger } from "#settings";

createEvent({
    event: "ready",
    name: "Bot Ready - Initialize Guild Defaults",
    once: true,
    async run(client) {
        logger.success(`Bot is ready! Logged in as ${client.user.tag}`);
        
        // Initialize guild defaults for bot notifications
        await configManager.initializeGuildDefaults(client);
    }
});