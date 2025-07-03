import { Client } from "discord.js";
import { logger } from "#settings";
import { configManager } from "./configManager.js";

/**
 * Initialize all guilds with default settings
 * @param client - Discord client instance
 */
export async function initializeGuildDefaults(client: Client): Promise<void> {
  try {
    await configManager.initializeGuildDefaults(client);
  } catch (error) {
    logger.error("Error initializing guild defaults:", error);
  }
}

/**
 * Send a notification message to the configured Bot settings notification channel for a guild
 * @param client - Discord client instance
 * @param guildId - The guild ID to send the notification to
 * @param message - The message content to send
 * @returns Promise<boolean> - Returns true if message was sent successfully, false otherwise
 */
export async function sendBotNotification(
  client: Client,
  guildId: string,
  message: string
): Promise<boolean> {
  try {
    const guildConfig = await configManager.getGuildConfig(guildId);

    if (!guildConfig || !guildConfig.enabled) {
      return false;
    }

    const guild = client.guilds.cache.get(guildId);
    if (!guild) {
      logger.warn(`Guild ${guildId} not found in cache`);
      return false;
    }

    const channel = guild.channels.cache.get(guildConfig.channelid);
    if (!channel || !channel.isTextBased()) {
      logger.warn(`Notification channel ${guildConfig.channelid} not found or not text-based in guild ${guildId}`);
      return false;
    }

    // Check bot permissions in the channel
    const botMember = guild.members.me;
    if (!botMember) {
      logger.warn(`Bot member not found in guild ${guildId}`);
      return false;
    }

    const channelPermissions = channel.permissionsFor(botMember);
    if (!channelPermissions?.has(['ViewChannel', 'SendMessages'])) {
      logger.warn(`Bot lacks required permissions in notification channel ${guildConfig.channelid} for guild ${guildId}`);
      return false;
    }

    await channel.send(message);
    return true;

  } catch (error) {
    logger.error(`Error sending guild notification to guild ${guildId}:`, error);
    return false;
  }
}

/**
 * Send a notification message to all configured guild settings notification channels
 * @param client - Discord client instance
 * @param message - The message content to send
 * @returns Promise<number> - Returns the number of guilds the message was successfully sent to
 */
export async function sendBotNotificationToAll(
  client: Client,
  message: string
): Promise<number> {
  try {
    const config = await configManager.getConfig();
    let successCount = 0;

    for (const [guildId, guildConfig] of Object.entries(config.guilds)) {
      if (guildConfig.enabled) {
        const success = await sendBotNotification(client, guildId, message);
        if (success) {
          successCount++;
        }
      }
    }

    return successCount;

  } catch (error) {
    logger.error("Error sending guild notification to all guilds:", error);
    return 0;
  }
}

/**
 * Get the notification channel configuration for a specific guild
 * @param guildId - The guild ID to get configuration for
 * @returns Promise<object | null> - Returns the guild configuration or null if not found
 */
export async function getBotNotificationConfig(guildId: string) {
  try {
    return await configManager.getGuildConfig(guildId);
  } catch (error) {
    logger.error(`Error getting notification config for guild ${guildId}:`, error);
    return null;
  }
}

/**
 * Check if a guild has bot notifications enabled
 * @param guildId - The guild ID to check
 * @returns Promise<boolean> - Returns true if notifications are enabled, false otherwise
 */
export async function isNotificationEnabled(guildId: string): Promise<boolean> {
  try {
    return await configManager.isNotificationEnabled(guildId);
  } catch (error) {
    logger.error(`Error checking notification status for guild ${guildId}:`, error);
    return false;
  }
}