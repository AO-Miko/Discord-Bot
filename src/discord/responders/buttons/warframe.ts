import { createResponder, ResponderType } from "#base";
import { createRow } from "@magicyan/discord";
import { EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder } from "discord.js";

// Shared cache and utility functions for optimization
interface CacheEntry {
    data: any;
    timestamp: number;
}

const sharedApiCache = new Map<string, CacheEntry>();
const SHARED_CACHE_DURATION = 60000; // 1 minute cache

// Optimized fetch function with caching
async function fetchWithSharedCache(endpoint: string): Promise<any> {
    const cacheKey = endpoint;
    const cached = sharedApiCache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < SHARED_CACHE_DURATION) {
        return cached.data;
    }
    
    try {
        const response = await fetch(`${WARFRAME_API_BASE}${endpoint}${WARFRAME_API_LANGUAGE}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        sharedApiCache.set(cacheKey, {
            data,
            timestamp: Date.now()
        });
        
        return data;
    } catch (error) {
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



const WARFRAME_API_BASE = "https://api.warframestat.us/pc";
const WARFRAME_API_LANGUAGE = "?language=en";

// Back to main menu responder
createResponder({
    customId: "warframe/back",
    types: [ResponderType.Button],
    cache: "cached",
    async run(interaction) {
        await interaction.deferUpdate();
        
        try {
            // Re-fetch data with optimized caching
            const [worldState, alerts, events] = await Promise.allSettled([
                fetchWithSharedCache(''),
                fetchWithSharedCache('/alerts'),
                fetchWithSharedCache('/events')
            ]);
            
            const worldStateData = worldState.status === 'fulfilled' ? worldState.value : {};
            const alertsData = alerts.status === 'fulfilled' ? alerts.value : [];
            const eventsData = events.status === 'fulfilled' ? events.value : [];
            
            const embed = new EmbedBuilder()
                .setTitle("🎮 Warframe Information Hub")
                .setColor(0x00D4FF)
                .setTimestamp()
                .setFooter({ 
                    text: '🌌 Warframe Status • Real-time game data', 
                    iconURL: 'https://i.imgur.com/warframe-icon.png' 
                });
                
            let description = "**🌟 Current Warframe Status**\n\n";
            
            // Add alerts info
            description += "**🚨 Active Alerts**\n";
            const activeAlerts = alertsData?.slice(0, 3) || [];
            if (activeAlerts.length > 0) {
                description += `📊 **${alertsData.length}** alerts currently active\n\n`;
                activeAlerts.forEach((alert: any, index: number) => {
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
            
            // Add events info
            description += "**🎭 Active Events**\n";
            const activeEvents = eventsData?.slice(0, 2) || [];
            if (activeEvents.length > 0) {
                description += `📊 **${eventsData.length}** events currently running\n\n`;
                activeEvents.forEach((event: any, index: number) => {
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
            
            // Add server time
            if (worldStateData?.timestamp) {
                const serverTime = formatTimeString(worldStateData.timestamp);
                description += `\n**🕒 Server Time:** \`${serverTime}\`\n`;
            }
            
            description += "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";
            description += "**📋 Use the /warframe command to access detailed information.**";
            
            embed.setDescription(description);
            
            // Create main navigation select menu
            const mainSelectMenu = createRow(
                new StringSelectMenuBuilder()
                    .setCustomId("warframe/category")
                    .setPlaceholder("🎮 Select Warframe Category")
                    .addOptions(
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
                            .setDescription("Monitor faction invasions and rewards")
                            .setValue("invasion")
                            .setEmoji("⚔️"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Archon Hunt")
                            .setDescription("View weekly Archon Hunt missions")
                            .setValue("archonhunt")
                            .setEmoji("👹"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Daily Sortie")
                            .setDescription("Check today's sortie missions")
                            .setValue("sortie")
                            .setEmoji("🎯"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel("Incarnon Tracker")
                            .setDescription("Track weekly Incarnon Genesis rotations")
                            .setValue("incarnon")
                            .setEmoji("⚡"),
                        new StringSelectMenuOptionBuilder()
                            .setLabel("World Cycles")
                            .setDescription("View day/night cycles across worlds")
                            .setValue("cycles")
                            .setEmoji("🌍")
                    )
            );
            
            await interaction.editReply({
                embeds: [embed],
                components: [mainSelectMenu]
            });
        } catch (error) {
            console.error('Warframe back error:', error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle("❌ Unable to Load Main Menu")
                .setDescription(
                    "Unable to load the main Warframe menu.\n\n" +
                    "*Please try again in a few moments.*"
                )
                .setColor(0xFF0000)
                .setTimestamp();
                
            await interaction.editReply({
                embeds: [errorEmbed],
                components: []
            });
        }
    }
});
