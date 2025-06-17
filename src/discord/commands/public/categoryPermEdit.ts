import { createCommand } from "#base";
import { ApplicationCommandType, ChannelType, MessageFlags } from "discord.js";
const allowed = "1100831477190643842"
const channeltoinform = "1282733468543094824"
createCommand({
    global: true,
    name: "categoryperm",
    description: "Manage permissions for all channels in a category",
    type: ApplicationCommandType.ChatInput,
    options: [
        {
            name: "category",
            description: "The category to modify permissions for",
            type: 3, // STRING type
            required: true,
            autocomplete: true
        },
        {
            name: "role",
            description: "The role to modify permissions for",
            type: 8, // ROLE type
            required: true
        },
        {
            name: "permission",
            description: "The permission to modify for the role",
            type: 3, // STRING type
            required: true,
            choices: [
                 {
                     name: "View Channel",
                     value: "ViewChannel"
                 },
                 {
                     name: "Manage Channels",
                     value: "ManageChannels"
                 },
                 {
                     name: "Send Messages",
                     value: "SendMessages"
                 },
                 {
                     name: "Send TTS Messages",
                     value: "SendTTSMessages"
                 },
                 {
                     name: "Manage Messages",
                     value: "ManageMessages"
                 },
                 {
                     name: "Embed Links",
                     value: "EmbedLinks"
                 },
                 {
                     name: "Attach Files",
                     value: "AttachFiles"
                 },
                 {
                     name: "Read Message History",
                     value: "ReadMessageHistory"
                 },
                 {
                     name: "Mention Everyone (@everyone/@here)",
                     value: "MentionEveryone"
                 },
                 {
                     name: "Use External Emojis",
                     value: "UseExternalEmojis"
                 },
                 {
                     name: "Add Reactions",
                     value: "AddReactions"
                 },
                 {
                     name: "Create Instant Invite",
                     value: "CreateInstantInvite"
                 },
                 {
                     name: "Connect (Voice)",
                     value: "Connect"
                 },
                 {
                     name: "Speak (Voice)",
                     value: "Speak"
                 },
                 {
                     name: "Stream",
                     value: "Stream"
                 },
                 {
                     name: "Priority Speaker",
                     value: "PrioritySpeaker"
                 },
                 {
                     name: "Mute Members (Voice)",
                     value: "MuteMembers"
                 },
                 {
                     name: "Deafen Members (Voice)",
                     value: "DeafenMembers"
                 },
                 {
                     name: "Move Members (Voice)",
                     value: "MoveMembers"
                 },
                 {
                     name: "Use Voice Activity Detection",
                     value: "UseVAD"
                 }
             ]
        },
        {
            name: "action",
            description: "What to do with the permission",
            type: 3, // STRING type
            required: true,
            choices: [
                {
                    name: "Enable (Allow)",
                    value: "enable"
                },
                {
                    name: "Disable (Deny)",
                    value: "disable"
                },
                {
                    name: "Neutral (Inherit)",
                    value: "neutral"
                }
            ]
        },
        {
            name: "ephemeral",
            description: "Whether the response should be ephemeral (only visible to you)",
            type: 5, // BOOLEAN type
            required: true
        }
    ],
    async run(interaction) {
        // Check if the user has the specific ID
        if (interaction.user.id !== allowed) {
            await interaction.reply({
                content: "❌ You don't have permission to use this command.",
                ephemeral: true,
                flags: MessageFlags.Ephemeral

            });
            return;
        }

        const ephemeral = interaction.options.getBoolean("ephemeral") ?? true;
        await interaction.deferReply({ flags: ephemeral ? MessageFlags.Ephemeral : undefined });

        try {
            const categoryId = interaction.options.getString("category", true);
            const role = interaction.options.getRole("role", true);
            const permission = interaction.options.getString("permission", true);
            const action = interaction.options.getString("action", true);

            // Get the category channel
            const category = await interaction.guild?.channels.fetch(categoryId);
            if (!category || category.type !== ChannelType.GuildCategory) {
                await interaction.editReply("❌ Invalid category provided.");
                return;
            }

            // Get all channels in the category
            const channels = interaction.guild?.channels.cache.filter(channel => 
                channel.parentId === category.id
            );

            if (!channels || channels.size === 0) {
                await interaction.editReply("❌ No channels found in this category.");
                return;
            }

            // Process each channel
            let successCount = 0;
            let failCount = 0;
            const failedChannels = [];
            const successfulChannels = [];

            for (const [_, channel] of channels) {
                try {
                    // Check if channel supports permission overwrites
                    if ('permissionOverwrites' in channel && channel.permissionOverwrites) {
                        // Set the specified permission for the role in this channel
                        const permissionUpdate: any = {};
                        if (action === "enable") {
                            permissionUpdate[permission] = true;
                        } else if (action === "disable") {
                            permissionUpdate[permission] = false;
                        } else if (action === "neutral") {
                            permissionUpdate[permission] = null;
                        }
                        await channel.permissionOverwrites.edit(role, permissionUpdate);
                        successCount++;
                        successfulChannels.push({ name: channel.name, id: channel.id });
                    } else {
                        failCount++;
                        failedChannels.push(channel.name || 'Unknown Channel');
                    }
                } catch (error) {
                    console.error(`Error updating permissions for channel ${channel.name}:`, error);
                    failCount++;
                    failedChannels.push(channel.name || 'Unknown Channel');
                }
            }

            // Send response
            const readablePermission = {
                 "ViewChannel": "View Channel",
                 "ManageChannels": "Manage Channels",
                 "SendMessages": "Send Messages",
                 "SendTTSMessages": "Send TTS Messages",
                 "ManageMessages": "Manage Messages",
                 "EmbedLinks": "Embed Links",
                 "AttachFiles": "Attach Files",
                 "ReadMessageHistory": "Read Message History",
                 "MentionEveryone": "@everyone/@here mention",
                 "UseExternalEmojis": "Use External Emojis",
                 "AddReactions": "Add Reactions",
                 "CreateInstantInvite": "Create Instant Invite",
                 "Connect": "Connect (Voice)",
                 "Speak": "Speak (Voice)",
                 "Stream": "Stream",
                 "PrioritySpeaker": "Priority Speaker",
                 "MuteMembers": "Mute Members (Voice)",
                 "DeafenMembers": "Deafen Members (Voice)",
                 "MoveMembers": "Move Members (Voice)",
                 "UseVAD": "Use Voice Activity Detection"
             }[permission] || permission;
            
            const actionText = action === "enable" ? "enabled" : action === "disable" ? "disabled" : "set to neutral";
            let responseMessage = `✅ Successfully ${actionText} \`${readablePermission}\` permission for role \`${role.name}\` in **${successCount}** channels of category **${category.name}**`;
            
            if (failCount > 0) {
                responseMessage += `\n\n❌ Failed to update **${failCount}** channels: ${failedChannels.join(", ")}`;
            }

            await interaction.editReply(responseMessage);

            // Send notification to the specified channel
            try {
                const notificationChannel = await interaction.guild?.channels.fetch();
                const informChannel = notificationChannel?.get(channeltoinform);
                if (informChannel?.isTextBased()) {
                    const channelList = successfulChannels.map(ch => `<#${ch.id}>`).join(", ");
                    const notificationMessage = `🔧 **Permission Change Notification**\n\n` +
                        `**User:** ${interaction.user.tag} (${interaction.user.id})\n` +
                        `**Category:** ${category.name}\n` +
                        `**Role:** \`${role.name}\`\n` +
                        `**Permission:** \`${readablePermission}\`\n` +
                        `**Action:** ${actionText}\n` +
                        `**Channels affected:** ${successCount} (${channelList})\n` +
                        (failCount > 0 ? `**Failed channels:** ${failCount}` : "");
                    
                    await informChannel.send(notificationMessage);
                }
            } catch (notificationError) {
                console.error("Error sending notification:", notificationError);
                // Don't fail the command if notification fails
            }

        } catch (error) {
            console.error("Error in categoryPermEdit command:", error);
            await interaction.editReply("❌ An error occurred while processing the command.");
        }
    },
    async autocomplete(interaction) {
        // Only allow the specific user to use autocomplete
        if (interaction.user.id !== allowed) {
            await interaction.respond([]);
            return;
        }

        const focusedValue = interaction.options.getFocused();
        const categories = interaction.guild?.channels.cache.filter(
            channel => channel.type === ChannelType.GuildCategory
        );

        if (!categories) {
            await interaction.respond([]);
            return;
        }

        const filtered = categories
            .filter(category => 
                category.name.toLowerCase().includes(focusedValue.toLowerCase())
            )
            .map(category => ({
                name: category.name,
                value: category.id
            }));

        await interaction.respond(filtered.slice(0, 25));
    }
});