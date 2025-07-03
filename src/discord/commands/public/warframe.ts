import { createCommand } from "#base";
import { createRow } from "@magicyan/discord";
import { ApplicationCommandType, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";

// Type definitions for Warframe API responses
interface WarframeAlert {
    mission?: {
        reward?: {
            asString?: string;
        };
        node?: string;
    };
}

interface WarframeEvent {
    description?: string;
    tooltip?: string;
}

interface WarframeWorldState {
    timestamp?: string;
    [key: string]: any;
}

// Cache for API responses to reduce redundant requests
interface CacheEntry {
    data: any;
    timestamp: number;
}

const apiCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 60000; // 1 minute cache

const WARFRAME_API_BASE = "https://api.warframestat.us/pc";
const WARFRAME_API_LANGUAGE = "?language=en";

// Optimized fetch function with caching and error handling
async function fetchWithCache(endpoint: string): Promise<any> {
    const cacheKey = endpoint;
    const cached = apiCache.get(cacheKey);

    // Return cached data if still valid
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        return cached.data;
    }

    try {
        const response = await fetch(`${WARFRAME_API_BASE}${endpoint}${WARFRAME_API_LANGUAGE}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        // Cache the response
        apiCache.set(cacheKey, {
            data,
            timestamp: Date.now()
        });

        return data;
    } catch (error) {
        // If we have cached data, return it even if expired during errors
        if (cached) {
            console.warn(`API error, using cached data: ${error}`);
            return cached.data;
        }
        throw error;
    }
}

// Helper function to format time strings
function formatTimeString(timestamp: string): string {
    try {
        return new Date(timestamp).toLocaleString('en-US', {
            timeZone: 'UTC',
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZoneName: 'short'
        });
    } catch {
        return 'Unknown time';
    }
}

// Helper function to safely get array slice
function safeSlice<T>(array: T[] | undefined, count: number): T[] {
    return array?.slice(0, count) || [];
}

createCommand({
    name: "warframe",
    description: "Get Warframe game information 🎮",
    type: ApplicationCommandType.ChatInput,
    global:true,
    async run(interaction) {
        await interaction.deferReply();

        try {
            // Fetch basic Warframe data with optimized parallel requests
            const [worldState, alerts, events] = await Promise.allSettled([
                fetchWithCache(''),
                fetchWithCache('/alerts'),
                fetchWithCache('/events')
            ]);

            // Extract data from settled promises
            const worldStateData: WarframeWorldState = worldState.status === 'fulfilled' ? worldState.value : {};
            const alertsData: WarframeAlert[] = alerts.status === 'fulfilled' ? alerts.value : [];
            const eventsData: WarframeEvent[] = events.status === 'fulfilled' ? events.value : [];

            // Create main info embed with enhanced styling
            const embed = new EmbedBuilder()
                .setTitle("🎮 Warframe Information Hub")
                .setColor(0x00D4FF)
                .setTimestamp()
                .setFooter({
                    text: '🌌 Warframe Status • Real-time game data',
                    iconURL: 'https://i.imgur.com/warframe-icon.png'
                });

            // Build description with enhanced formatting and error resilience
            let description = "**🌟 Current Warframe Status**\n\n";

            // Add alerts info with better formatting
            description += "**🚨 Active Alerts**\n";
            const activeAlerts = safeSlice(alertsData, 3);
            if (activeAlerts.length > 0) {
                description += `📊 **${alertsData.length}** alerts currently active\n\n`;
                activeAlerts.forEach((alert, index) => {
                    const reward = alert.mission?.reward?.asString || "Unknown reward";
                    const node = alert.mission?.node || "Unknown location";
                    const prefix = index === activeAlerts.length - 1 ? "└─" : "├─";
                    description += `${prefix} **${node}**\n`;
                    description += `${index === activeAlerts.length - 1 ? "   " : "│  "} 🎁 ${reward}\n`;
                });
                if (alertsData.length > 3) {
                    description += `\n*...and ${alertsData.length - 3} more alerts*\n`;
                }
            } else {
                description += "🔹 No active alerts\n";
            }

            description += "\n";

            // Add events info with improved presentation
            description += "**🎭 Active Events**\n";
            const activeEvents = safeSlice(eventsData, 2);
            if (activeEvents.length > 0) {
                description += `📊 **${eventsData.length}** events currently running\n\n`;
                activeEvents.forEach((event, index) => {
                    const eventName = event.description || event.tooltip || "Unknown event";
                    const prefix = index === activeEvents.length - 1 ? "└─" : "├─";
                    description += `${prefix} ${eventName}\n`;
                });
                if (eventsData.length > 2) {
                    description += `\n*...and ${eventsData.length - 2} more events*\n`;
                }
            } else {
                description += "🔹 No active events\n";
            }

            // Add server time with better formatting
            if (worldStateData?.timestamp) {
                const serverTime = formatTimeString(worldStateData.timestamp);
                description += `\n**🕒 Server Time:** \`${serverTime}\`\n`;
            }

            description += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
            description += "**📋 Select a category below for detailed information:**";

            embed.setDescription(description);

            // Create select menu for better organization and easier editing
            const selectMenu = createRow(
                new StringSelectMenuBuilder()
                    .setCustomId("warframe/category")
                    .setPlaceholder("📋 Select a Warframe category...")
                    .addOptions([
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Void Fissures")
                            .setDescription("View active void fissures and relic missions")
                            .setValue("fissures")
                            .setEmoji("🌀"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Nightwave")
                            .setDescription("Check Nightwave challenges and rewards")
                            .setValue("nightwave")
                            .setEmoji("🌙"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Invasions")
                            .setDescription("View current faction invasions")
                            .setValue("invasion")
                            .setEmoji("⚔️"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Archon Hunt")
                            .setDescription("Check weekly Archon Hunt missions")
                            .setValue("archonhunt")
                            .setEmoji("🏹"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Daily Sortie")
                            .setDescription("View today's Sortie missions")
                            .setValue("sortie")
                            .setEmoji("🎯"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel("World Cycles")
                            .setDescription("Check day/night and other world cycles")
                            .setValue("cycles")
                            .setEmoji("🌍"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Incarnon Tracker")
                            .setDescription("Track weekly Incarnon Genesis rotations")
                            .setValue("incarnon")
                            .setEmoji("⚡")
                    ])
            );

            await interaction.editReply({
                embeds: [embed],
                components: [selectMenu]
            });

        } catch (error) {
            console.error('Warframe command error:', error);

            // Enhanced error response with retry option
            const errorEmbed = new EmbedBuilder()
                .setTitle("❌ Warframe Data Unavailable")
                .setDescription(
                    "Unable to fetch Warframe data at the moment.\n\n" +
                    "**Possible causes:**\n" +
                    "• Warframe API is temporarily down\n" +
                    "• Network connectivity issues\n" +
                    "• Server maintenance in progress\n\n" +
                    "*Please try again in a few moments.*"
                )
                .setColor(0xFF0000)
                .setTimestamp();

            await interaction.editReply({
                embeds: [errorEmbed],
                components: [
                    createRow(
                        new ButtonBuilder({
                            customId: "warframe/retry",
                            label: "🔄 Retry",
                            style: ButtonStyle.Primary
                        })
                    )
                ]
            });
        }
    }
});