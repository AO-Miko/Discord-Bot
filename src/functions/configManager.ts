import { logger } from "#settings";
import fs from "fs/promises";
import path from "path";
import { Client } from "discord.js";

const CONFIG_FILE_PATH = path.join(process.cwd(), "bot_notifications.json");

interface NotificationConfig {
  guilds: {
    [guildId: string]: {
      bot_notification: string;
      channelid: string;
      enabled: boolean;
    }
  }
}

class ConfigManager {
  private config: NotificationConfig | null = null;
  private isLoading = false;

  /**
   * Load configuration from file (only if not already loaded)
   */
  private async loadConfig(): Promise<NotificationConfig> {
    if (this.config !== null) {
      return this.config!;
    }

    if (this.isLoading) {
      // Wait for ongoing load to complete
      while (this.isLoading) {
        await new Promise(resolve => setTimeout(resolve, 10));
      }
      return this.config!;
    }

    this.isLoading = true;
    try {
      const data = await fs.readFile(CONFIG_FILE_PATH, "utf-8");
      this.config = JSON.parse(data);
    } catch (error) {
      logger.warn("Bot notifications config file not found, creating default config");
      this.config = { guilds: {} };
      await this.saveConfig();
    } finally {
      this.isLoading = false;
    }

    return this.config!;
  }

  /**
   * Save configuration to file
   */
  private async saveConfig(): Promise<void> {
    if (!this.config) {
      throw new Error("No config to save");
    }

    try {
      await fs.writeFile(CONFIG_FILE_PATH, JSON.stringify(this.config, null, 2));
    } catch (error) {
      logger.error("Error saving notification config:", error);
      throw error;
    }
  }

  /**
   * Get the full configuration
   */
  async getConfig(): Promise<NotificationConfig> {
    return await this.loadConfig();
  }

  /**
   * Get configuration for a specific guild
   */
  async getGuildConfig(guildId: string) {
    const config = await this.loadConfig();
    return config.guilds[guildId] || null;
  }

  /**
   * Set configuration for a specific guild
   */
  async setGuildConfig(guildId: string, guildConfig: { bot_notification: string; channelid: string; enabled: boolean }): Promise<void> {
    const config = await this.loadConfig();
    const hasChanges = !config.guilds[guildId] || 
      config.guilds[guildId].bot_notification !== guildConfig.bot_notification ||
      config.guilds[guildId].channelid !== guildConfig.channelid ||
      config.guilds[guildId].enabled !== guildConfig.enabled;

    if (hasChanges) {
      config.guilds[guildId] = { ...guildConfig };
      await this.saveConfig();
    }
  }

  /**
   * Remove configuration for a specific guild
   */
  async removeGuildConfig(guildId: string): Promise<void> {
    const config = await this.loadConfig();
    if (config.guilds[guildId]) {
      delete config.guilds[guildId];
      await this.saveConfig();
    }
  }

  /**
   * Initialize guild defaults only for new guilds (called once on startup)
   */
  async initializeGuildDefaults(client: Client): Promise<void> {
    const config = await this.loadConfig();
    let hasChanges = false;

    // Add default settings for new guilds
    for (const [guildId] of client.guilds.cache) {
      if (!config.guilds[guildId]) {
        config.guilds[guildId] = {
          bot_notification: "disabled",
          channelid: "",
          enabled: false
        };
        hasChanges = true;
      }
    }

    // Remove configurations for guilds the bot is no longer in
    for (const guildId of Object.keys(config.guilds)) {
      if (!client.guilds.cache.has(guildId)) {
        delete config.guilds[guildId];
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await this.saveConfig();
    }
  }

  /**
   * Add default configuration for a new guild
   */
  async addGuildDefault(guildId: string): Promise<void> {
    const config = await this.loadConfig();
    if (!config.guilds[guildId]) {
      config.guilds[guildId] = {
        bot_notification: "disabled",
        channelid: "",
        enabled: false
      };
      await this.saveConfig();
    }
  }

  /**
   * Check if notifications are enabled for a guild
   */
  async isNotificationEnabled(guildId: string): Promise<boolean> {
    const guildConfig = await this.getGuildConfig(guildId);
    return guildConfig?.enabled === true;
  }
}

// Export singleton instance
export const configManager = new ConfigManager();