import { createEvent } from "#base";
import { logger } from "#settings";
import { configManager } from "#functions";

createEvent({
    event: "guildCreate",
    name: "Guild Join - Add Default Settings",
    async run(guild) {
        logger.log(`Joined new guild: ${guild.name} (${guild.id})`);
        
        try {
            // Add default notification settings for the new guild
            await configManager.addGuildDefault(guild.id);
            logger.log(`Added default notification settings for guild: ${guild.name}`);
        } catch (error) {
            logger.error(`Error adding default settings for guild ${guild.id}:`, error);
        }
    }
});