import { createCommand } from "#base";
import { ApplicationCommandType, ChannelType, MessageFlags, PermissionFlagsBits, EmbedBuilder } from "discord.js";
import { logger } from "#settings";
import { configManager } from "#functions/configManager.js";



/**
 * Check if user has permission to use this command
 */
function hasPermission(interaction: any): boolean {
  return interaction.member?.permissions?.has(PermissionFlagsBits.Administrator);
}

/**
 * Check if bot has necessary permissions in the channel
 */
function hasBotPermissions(channel: any, botMember: any): { hasPermission: boolean; missingPermissions: string[] } {
     const requiredPermissions = [
         PermissionFlagsBits.ViewChannel,
         PermissionFlagsBits.SendMessages,
         PermissionFlagsBits.EmbedLinks
     ];
     
     const missingPermissions: string[] = [];
     
     for (const permission of requiredPermissions) {
         if (!channel.permissionsFor(botMember)?.has(permission)) {
             switch (permission) {
                 case PermissionFlagsBits.ViewChannel:
                     missingPermissions.push("View Channel");
                     break;
                 case PermissionFlagsBits.SendMessages:
                     missingPermissions.push("Send Messages");
                     break;
                 case PermissionFlagsBits.EmbedLinks:
                     missingPermissions.push("Embed Links");
                     break;
             }
         }
     }
     
     return {
         hasPermission: missingPermissions.length === 0,
         missingPermissions
     };
 }

createCommand({
  global: true,
  name: "bot_notification",
  description: "Manage bot notification channels for this guild",
  type: ApplicationCommandType.ChatInput,
  options: [
    {
      name: "action",
      description: "The action to perform",
      type: 3, // STRING type
      required: true,
      choices: [
        {
          name: "Add notification channel",
          value: "add"
        },
        {
          name: "Edit notification channel",
          value: "edit"
        },
        {
          name: "Remove notifications",
          value: "remove"
        },
        {
          name: "View status",
          value: "status"
        }
      ]
    },
    {
      name: "channel",
      description: "The channel to use for bot notifications (required for add/edit)",
      type: 7, // CHANNEL type
      required: false,
      channel_types: [ChannelType.GuildText, ChannelType.GuildAnnouncement]
    }
  ],
  async run(interaction) {
    // Check if the user has administrator permission
    if (!hasPermission(interaction)) {
      await interaction.reply({
        content: "❌ You need Administrator permission to use this command.",
        flags: MessageFlags.Ephemeral
      });
      return;
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    try {
      const action = interaction.options.getString("action", true);
      const guildId = interaction.guildId;

      if (!guildId) {
        await interaction.editReply("❌ This command can only be used in a guild.");
        return;
      }

      let channel = null;
      if (action === "add" || action === "edit") {
        channel = interaction.options.getChannel("channel");
        
        if (!channel) {
          await interaction.editReply(`❌ Channel is required for ${action} action.`);
          return;
        }
        
        // Validate channel type
        if (channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) {
          await interaction.editReply("❌ Please select a text or announcement channel.");
          return;
        }
        
        // Check bot permissions in the selected channel
        const botMember = interaction.guild?.members?.me;
        if (!botMember) {
          await interaction.editReply("❌ Unable to verify bot permissions.");
          return;
        }
        
        const permissionCheck = hasBotPermissions(channel, botMember);
        if (!permissionCheck.hasPermission) {
          await interaction.editReply(
            `❌ The bot is missing required permissions in ${channel}:\n` +
            `Missing permissions: **${permissionCheck.missingPermissions.join(", ")}**\n\n` +
            `Please ensure the bot has the following permissions in the selected channel:\n` +
            `• View Channel\n` +
            `• Send Messages\n` +
            `• Embed Links`
          );
          return;
        }
      }

      if (action === "add") {
        // Check if notification is already configured
        const existingConfig = await configManager.getGuildConfig(guildId);
        if (existingConfig?.enabled) {
          await interaction.editReply(
            `❌ Bot notifications are already configured for this guild.\n` +
            `Current channel: <#${existingConfig.channelid}>\n` +
            `Use the \`edit\` subcommand to change the channel.`
          );
          return;
        }

        // Add notification channel
        await configManager.setGuildConfig(guildId, {
          bot_notification: "enabled",
          channelid: channel!.id,
          enabled: true
        });

        await interaction.editReply(
          `✅ Bot notification channel has been set to ${channel}\n` +
          `All bot notifications for this guild will now be sent to this channel.`
        );

        // Send a test notification to the channel
        try {
          if (channel!.isTextBased()) {
            await channel!.send(
              `🔔 **Bot Notification Channel Configured**\n\n` +
              `This channel has been set as the bot notification channel for **${interaction.guild?.name}**.\n` +
              `Configured by: ${interaction.user.tag} (${interaction.user.id})`
            );
          }
        } catch (error) {
          logger.error("Error sending test notification:", error);
        }

      } else if (action === "edit") {
        // Check if notification is configured
        const existingConfig = await configManager.getGuildConfig(guildId);
        if (!existingConfig?.enabled) {
          await interaction.editReply(
            `❌ Bot notifications are not configured for this guild.\n` +
            `Use the \`add\` action to set up notifications first.`
          );
          return;
        }

        const oldChannelId = existingConfig.channelid;

        // Update notification channel
        await configManager.setGuildConfig(guildId, {
          bot_notification: "enabled",
          channelid: channel!.id,
          enabled: true
        });

        await interaction.editReply(
          `✅ Bot notification channel has been updated.\n` +
          `Previous channel: <#${oldChannelId}>\n` +
          `New channel: ${channel}\n` +
          `All bot notifications for this guild will now be sent to the new channel.`
        );

        // Send a notification to the new channel
        try {
          if (channel!.isTextBased()) {
            await channel!.send(
              `🔔 **Bot Notification Channel Updated**\n\n` +
              `This channel has been set as the new bot notification channel for **${interaction.guild?.name}**.\n` +
              `Updated by: ${interaction.user.tag} (${interaction.user.id})`
            );
          }
        } catch (error) {
          logger.error("Error sending update notification:", error);
        }

      } else if (action === "remove") {
        // Check if notification is configured
        const existingConfig = await configManager.getGuildConfig(guildId);
        if (!existingConfig?.enabled) {
          await interaction.editReply(
            `❌ Bot notifications are not configured for this guild.\n` +
            `There is nothing to remove.`
          );
          return;
        }

        // Remove notification channel - set to default disabled state
        await configManager.setGuildConfig(guildId, {
          bot_notification: "disabled",
          channelid: "",
          enabled: false
        });

        await interaction.editReply(
          `✅ Bot notification channel has been removed.\n` +
          `Bot notifications are now disabled for this guild.`
        );

      } else if (action === "status") {
        // Check bot permissions
        const botMember = interaction.guild?.members?.me;
        if (!botMember) {
          await interaction.editReply("❌ Unable to verify bot permissions.");
          return;
        }
        
        const requiredPermissions = [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.EmbedLinks
        ];
        
        const missingPermissions: string[] = [];
        
        for (const permission of requiredPermissions) {
          if (!botMember?.permissions?.has(permission)) {
            switch (permission) {
              case PermissionFlagsBits.ViewChannel:
                missingPermissions.push("View Channel");
                break;
              case PermissionFlagsBits.SendMessages:
                missingPermissions.push("Send Messages");
                break;
              case PermissionFlagsBits.EmbedLinks:
                missingPermissions.push("Embed Links");
                break;
            }
          }
        }
        
        const permissionCheck = {
          hasPermission: missingPermissions.length === 0,
          missingPermissions
        };
        if (!permissionCheck.hasPermission) {
          await interaction.editReply(
            `❌ The bot is missing required permissions:\n` +
            `Missing permissions: **${permissionCheck.missingPermissions.join(", ")}**\n\n` +
            `Please ensure the bot has the following permissions:\n` +
            `• View Channel\n` +
            `• Send Messages\n` +
            `• Embed Links`
          );
          return;
        }

        const config = await configManager.getGuildConfig(guildId);

        const embed = new EmbedBuilder()
          .setTitle("🔔 Bot Notification Settings")
          .setColor(config?.enabled ? 0x00ff00 : 0xff0000)
          .setTimestamp();

        if (config && config.enabled) {
          const channel = interaction.guild?.channels.cache.get(config.channelid);
          
          embed.setDescription("✅ Bot notifications are **enabled** for this guild.")
            .addFields(
              {
                name: "📍 Notification Channel",
                value: channel ? `${channel} (${channel.name})` : `⚠️ Channel not found (ID: ${config.channelid})`,
                inline: false
              },
              {
                name: "📊 Status",
                value: config.bot_notification,
                inline: true
              },
              {
                name: "🔧 Channel ID",
                value: config.channelid,
                inline: true
              }
            );

          if (!channel) {
            embed.addFields({
              name: "⚠️ Warning",
              value: "The configured notification channel was not found. It may have been deleted. Please reconfigure using `/bot_notification add`.",
              inline: false
            });
          }
        } else {
          embed.setDescription("❌ Bot notifications are **disabled** for this guild.")
            .addFields(
              {
                name: "📊 Current Status",
                value: config ? config.bot_notification : "Not initialized",
                inline: true
              },
              {
                name: "💡 How to enable",
                value: "Use `/bot_notification add channel:<channel>` to set up bot notifications.",
                inline: false
              }
            );
        }

        embed.setFooter({
          text: `Requested by ${interaction.user.tag}`,
          iconURL: interaction.user.displayAvatarURL()
        });

        await interaction.editReply({ embeds: [embed] });
      }

    } catch (error) {
      logger.error("Error in bot_notification command:", error);
      await interaction.editReply("❌ An error occurred while processing the command.");
    }
  }
});