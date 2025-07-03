import { createEvent } from "#base";
import { logger } from "#settings";
import { configManager } from "#functions";

createEvent({
    event: "guildDelete",
    name: "Guild Leave - Remove Settings",
    async run(guild) {
        logger.log(`Left guild: ${guild.name} (${guild.id})`);
        
        try {
            // Remove notification settings for the guild
            await configManager.removeGuildConfig(guild.id);
            logger.log(`Removed notification settings for guild: ${guild.name}`);
        } catch (error) {
            logger.error(`Error removing settings for guild ${guild.id}:`, error);
        }
    }
});