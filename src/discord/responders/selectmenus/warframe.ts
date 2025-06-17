import { createResponder, ResponderType } from "#base";
import { createRow } from "@magicyan/discord";
import { ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuInteraction, StringSelectMenuOptionBuilder } from "discord.js";

// Helper function to create back button
function createBackButton() {
    return createRow(
        new ButtonBuilder()
            .setCustomId("warframe/back")
            .setLabel("🔙 Go Back to Main")
            .setStyle(ButtonStyle.Secondary)
    );
}

// API Configuration
const WARFRAME_API_BASE = "https://api.warframestat.us/pc";
const WARFRAME_API_LANGUAGE = "?language=en";

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

// Type definitions for Warframe API responses



interface WarframeFissure {
    tier?: string;
    missionType?: string;
    node?: string;
    eta?: string;
    isHard?: boolean;
    isStorm?: boolean;
}

interface WarframeNightwave {
    tag?: string;
    season?: number;
    phase?: number;
    activeChallenges?: Array<{
        title?: string;
        desc?: string;
        isDaily?: boolean;
        isElite?: boolean;
        reputation?: number;
        active?: boolean;
        isPermanent?: boolean;
    }>;
    rewardTypes?: string[];
}

interface WarframeInvasion {
    node?: string;
    completion?: number;
    attackingFaction?: string;
    defendingFaction?: string;
    attackerReward?: {
        asString?: string;
    };
    defenderReward?: {
        asString?: string;
    };
}

interface WarframeArchonHunt {
    active?: boolean;
    boss?: string;
    faction?: string;
    missions?: Array<{
        type?: string;
        node?: string;
    }>;
}

interface WarframeSortie {
    boss?: string;
    variants?: Array<{
        missionType?: string;
        node?: string;
        modifier?: string;
        modifierDescription?: string;
    }>;
}

// Main category select menu responder
createResponder({
    customId: "warframe/category",
    types: [ResponderType.StringSelect],
    cache: "cached",
    async run(interaction: StringSelectMenuInteraction) {
        await interaction.deferUpdate();
        
        const selectedValue = interaction.values[0];
        
        try {
            switch (selectedValue) {
                case "fissures":
                    await handleFissures(interaction);
                    break;
                case "nightwave":
                    await handleNightwave(interaction);
                    break;
                case "invasion":
                    await handleInvasions(interaction);
                    break;
                case "archonhunt":
                    await handleArchonHunt(interaction);
                    break;
                case "sortie":
                    await handleSortie(interaction);
                    break;
                case "cycles":
                    await handleCycles(interaction);
                    break;
                case "incarnon":
                    await handleIncarnon(interaction);
                    break;
                default:
                    await interaction.editReply({
                        content: "❌ Unknown category selected.",
                        components: [createBackButton()]
                    });
            }
        } catch (error) {
            console.error(`Warframe category error (${selectedValue}):`, error);
            
            const errorEmbed = new EmbedBuilder()
                .setTitle("❌ Error Loading Data")
                .setDescription(
                    "Unable to fetch the requested Warframe data.\n\n" +
                    "*Please try again in a few moments.*"
                )
                .setColor(0xFF0000)
                .setTimestamp();
                
            await interaction.editReply({
                embeds: [errorEmbed],
                components: [createBackButton()]
            });
        }
    }
});

// Handler functions for each category
async function handleFissures(interaction: StringSelectMenuInteraction) {
    const allFissures: WarframeFissure[] = await fetchWithSharedCache('/fissures');
    
    // Filter normal fissures
    const normalFissures = allFissures.filter((f: WarframeFissure) => !f.isHard && !f.isStorm);
    
    const embed = new EmbedBuilder()
        .setTitle("🌀 Void Fissure Command Center")
        .setColor(0x00CED1) // Dark turquoise
        .setTimestamp()
        .setFooter({ text: '🔮 Void Fissures • Crack relics for Prime rewards', iconURL: 'https://i.imgur.com/placeholder.png' });
    
    let description = "";
    
    if (normalFissures && normalFissures.length > 0) {
        description = `# 🌀 Active Void Fissures\n`;
        description += `╔═══════════════════════════════════════╗\n`;
        description += `║           VOID ANOMALIES              ║\n`;
        description += `║         🔮 PRIME OPPORTUNITIES 🔮      ║\n`;
        description += `╚═══════════════════════════════════════╝\n\n`;
        
        // Group by tier
        const groupedFissures = normalFissures.reduce<Record<string, WarframeFissure[]>>((acc, fissure) => {
            const tier = fissure.tier || 'Unknown';
            if (!acc[tier]) acc[tier] = [];
            acc[tier].push(fissure);
            return acc;
        }, {});
        
        Object.entries(groupedFissures).forEach(([tier, tierFissures]: [string, WarframeFissure[]]) => {
            description += `### 💎 ${tier} Relic Missions\n`;
            tierFissures.forEach((fissure, index) => {
                const timeLeft = fissure.eta || "Unknown";
                const isLast = index === tierFissures.length - 1;
                const prefix = isLast ? "└─" : "├─";
                description += `${prefix} **${fissure.missionType || 'Unknown'}** • ${fissure.node || 'Unknown Node'}\n`;
                description += `${isLast ? "   " : "│  "} ⏰ \`${timeLeft}\`\n`;
            });
            description += "\n";
        });
        
        description += `╔═══════════════════════════════════════╗\n`;
        description += `║ 🎯 Crack relics to obtain Prime parts! ║\n`;
        description += `╚═══════════════════════════════════════╝`;
    } else {
        description = `# 🌀 Active Void Fissures\n`;
        description += `╔═══════════════════════════════════════╗\n`;
        description += `║           VOID ANOMALIES              ║\n`;
        description += `║         🔮 PRIME OPPORTUNITIES 🔮      ║\n`;
        description += `╚═══════════════════════════════════════╝\n\n`;
        description += `### ⚠️ No Active Fissures\n`;
        description += `The Void is currently stable. No fissures detected.\n\n`;
        description += `*Check back soon for new Prime opportunities, Tenno!*`;
    }
    
    embed.setDescription(description);
    
    // Add sub-category select menu for fissures
    const fissureSelectMenu = createRow(
        new StringSelectMenuBuilder()
            .setCustomId("warframe/fissures/select")
            .setPlaceholder("🌀 Choose Fissure Type")
            .addOptions([
                new StringSelectMenuOptionBuilder()
                    .setLabel("Normal Fissures")
                    .setDescription("Standard void fissure missions")
                    .setValue("normal")
                    .setEmoji("🌀"),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Steel Path Fissures")
                    .setDescription("Enhanced difficulty fissures")
                    .setValue("steel")
                    .setEmoji("⚔️"),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Void Storms")
                    .setDescription("Railjack void fissure missions")
                    .setValue("storm")
                    .setEmoji("🌪️")
            ])
    );
    
    await interaction.editReply({
        embeds: [embed],
        components: [fissureSelectMenu, createBackButton()]
    });
}

async function handleNightwave(interaction: StringSelectMenuInteraction) {
    const nightwave: WarframeNightwave = await fetchWithSharedCache('/nightwave');
    
    const embed = new EmbedBuilder()
        .setTitle(`🌌 Nightwave Command Center`)
        .setColor(0x8A2BE2) // Blue violet color
        .setTimestamp()
        .setFooter({ text: '🎮 Warframe Nightwave Tracker • Stay Connected, Tenno', iconURL: 'https://i.imgur.com/placeholder.png' });
    
    let description = `# 🌙 ${nightwave.tag || 'Unknown Season'}\n`;
    description += `╔══════════════════════════════════════╗\n`;
    description += `║              SEASON STATUS           ║\n`;
    description += `╚══════════════════════════════════════╝\n\n`;
    
    description += `### 🏆 Season Information\n`;
    description += `**Season:** ${nightwave.season || 'Unknown'}\n`;
    description += `**Phase:** ${nightwave.phase || 'Unknown'}\n\n`;
    
    // Add challenges info
    const activeChallenges = nightwave.activeChallenges?.filter(c => c.active) || [];
    if (activeChallenges.length > 0) {
        description += `### 📋 Active Challenges (${activeChallenges.length})\n`;
        activeChallenges.slice(0, 5).forEach((challenge, index) => {
            const isLast = index === Math.min(activeChallenges.length, 5) - 1;
            const prefix = isLast ? "└─" : "├─";
            const challengeType = challenge.isElite ? "💎 Elite" : challenge.isDaily ? "📅 Daily" : "📝 Weekly";
            description += `${prefix} ${challengeType} • **${challenge.title || 'Unknown'}**\n`;
            description += `${isLast ? "   " : "│  "} 🎁 ${challenge.reputation || 0} Standing\n`;
        });
        if (activeChallenges.length > 5) {
            description += `\n*...and ${activeChallenges.length - 5} more challenges*\n`;
        }
    } else {
        description += `### ⚠️ No Active Challenges\n`;
        description += `No challenges are currently available.\n`;
    }
    
    embed.setDescription(description);
    
    // Add nightwave select menu for navigation
    const nightwaveSelectMenu = createRow(
        new StringSelectMenuBuilder()
            .setCustomId("warframe/nightwave/select")
            .setPlaceholder("🌙 Choose Nightwave Section")
            .addOptions([
                new StringSelectMenuOptionBuilder()
                    .setLabel("Overview")
                    .setDescription("View nightwave season overview")
                    .setValue("overview")
                    .setEmoji("🌙")
                    .setDefault(true),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Daily Challenges")
                    .setDescription("View daily challenge missions")
                    .setValue("daily")
                    .setEmoji("🌅"),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Weekly Challenges")
                    .setDescription("View weekly challenge missions")
                    .setValue("weekly")
                    .setEmoji("📊"),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Elite Challenges")
                    .setDescription("View elite challenge missions")
                    .setValue("elite")
                    .setEmoji("⭐")
            ])
    );
    
    await interaction.editReply({
        embeds: [embed],
        components: [nightwaveSelectMenu, createBackButton()]
    });
}



// Fissures select menu responder
createResponder({
    customId: "warframe/fissures/select",
    types: [ResponderType.StringSelect],
    cache: "cached",
    async run(interaction: StringSelectMenuInteraction) {
        await interaction.deferUpdate();
        
        const selectedValue = interaction.values[0];
        
        try {
            switch (selectedValue) {
                case "normal":
                    await handleFissuresNormal(interaction);
                    break;
                case "steel":
                    await handleFissuresSteel(interaction);
                    break;
                case "storm":
                    await handleFissuresStorm(interaction);
                    break;
                default:
                    throw new Error(`Unknown fissure selection: ${selectedValue}`);
            }
        } catch (error) {
            console.error("Error in fissures select menu:", error);
            await interaction.followUp({
                content: "❌ An error occurred while processing your selection. Please try again.",
                ephemeral: true
            });
        }
    }
});

// Nightwave select menu responder
createResponder({
    customId: "warframe/nightwave/select",
    types: [ResponderType.StringSelect],
    cache: "cached",
    async run(interaction: StringSelectMenuInteraction) {
        await interaction.deferUpdate();
        
        const selectedValue = interaction.values[0];
        
        try {
            switch (selectedValue) {
                case "overview":
                    await handleNightwaveOverview(interaction);
                    break;
                case "daily":
                    await handleNightwaveDaily(interaction);
                    break;
                case "weekly":
                    await handleNightwaveWeekly(interaction);
                    break;
                case "elite":
                    await handleNightwaveElite(interaction);
                    break;
                default:
                    throw new Error(`Unknown nightwave selection: ${selectedValue}`);
            }
        } catch (error) {
            console.error("Error in nightwave select menu:", error);
            await interaction.followUp({
                content: "❌ An error occurred while processing your selection. Please try again.",
                ephemeral: true
            });
        }
    }
});

// Invasion select menu responder
createResponder({
    customId: "warframe/invasion/select",
    types: [ResponderType.StringSelect],
    cache: "cached",
    async run(interaction: StringSelectMenuInteraction) {
        await interaction.deferUpdate();
        
        const selectedValue = interaction.values[0];
        
        try {
            switch (selectedValue) {
                case "corpus":
                    await handleInvasionCorpus(interaction);
                    break;
                case "grineer":
                    await handleInvasionGrineer(interaction);
                    break;
                case "infested":
                    await handleInvasionInfested(interaction);
                    break;
                default:
                    throw new Error(`Unknown invasion selection: ${selectedValue}`);
            }
        } catch (error) {
            console.error("Error in invasion select menu:", error);
            await interaction.followUp({
                content: "❌ An error occurred while processing your selection. Please try again.",
                ephemeral: true
            });
        }
    }
});

// Helper function to sort relic tiers in the correct order
function sortRelicTiers(tiers: string[]): string[] {
    const tierOrder = ['Lith', 'Neo', 'Meso', 'Axi', 'Requiem', 'Omnia'];
    return tiers.sort((a, b) => {
        const indexA = tierOrder.indexOf(a);
        const indexB = tierOrder.indexOf(b);
        // If tier not found in order, put it at the end
        if (indexA === -1 && indexB === -1) return a.localeCompare(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
    });
}

// Fissures handler functions
async function handleFissuresNormal(interaction: StringSelectMenuInteraction) {
    const allFissures: WarframeFissure[] = await fetchWithSharedCache('/fissures');
    const normalFissures = allFissures.filter((f: WarframeFissure) => !f.isHard && !f.isStorm);
    
    const embed = new EmbedBuilder()
        .setTitle("🌀 Normal Void Fissures")
        .setColor(0x00CED1)
        .setTimestamp();
    
    if (normalFissures && normalFissures.length > 0) {
        let description = `# 🌀 Standard Void Fissures\n`;
        description += `╔═══════════════════════════════════════╗\n`;
        description += `║         NORMAL DIFFICULTY             ║\n`;
        description += `║       🔮 PRIME OPPORTUNITIES 🔮       ║\n`;
        description += `╚═══════════════════════════════════════╝\n\n`;
        
        const groupedFissures = normalFissures.reduce<Record<string, WarframeFissure[]>>((acc, fissure) => {
            const tier = fissure.tier || 'Unknown';
            if (!acc[tier]) acc[tier] = [];
            acc[tier].push(fissure);
            return acc;
        }, {});
        
        const sortedTiers = sortRelicTiers(Object.keys(groupedFissures));
        
        sortedTiers.forEach((tier) => {
            const tierFissures = groupedFissures[tier];
            description += `### 💎 ${tier} Relic Missions\n`;
            tierFissures.forEach((fissure, index) => {
                const timeLeft = fissure.eta || "Unknown";
                const isLast = index === tierFissures.length - 1;
                const prefix = isLast ? "└─" : "├─";
                description += `${prefix} **${fissure.missionType || 'Unknown'}** • ${fissure.node || 'Unknown Node'}\n`;
                description += `${isLast ? "   " : "│  "} ⏰ \`${timeLeft}\`\n`;
            });
            description += "\n";
        });
        
        embed.setDescription(description);
    } else {
        embed.setDescription("### ⚠️ No Normal Fissures\nNo standard void fissures are currently active.");
    }
    
    // Add fissure type selector for easy switching
    const fissureSelectMenu = createRow(
        new StringSelectMenuBuilder()
            .setCustomId("warframe/fissures/select")
            .setPlaceholder("🌀 Switch Fissure Type")
            .addOptions([
                new StringSelectMenuOptionBuilder()
                    .setLabel("Normal Fissures")
                    .setDescription("Standard void fissure missions")
                    .setValue("normal")
                    .setEmoji("🌀")
                    .setDefault(true),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Steel Path Fissures")
                    .setDescription("Enhanced difficulty fissures")
                    .setValue("steel")
                    .setEmoji("⚔️"),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Void Storms")
                    .setDescription("Railjack void fissure missions")
                    .setValue("storm")
                    .setEmoji("🌪️")
            ])
    );
    
    await interaction.editReply({
         embeds: [embed],
         components: [fissureSelectMenu, createBackButton()]
     });
}

async function handleFissuresSteel(interaction: StringSelectMenuInteraction) {
    const allFissures: WarframeFissure[] = await fetchWithSharedCache('/fissures');
    const steelFissures = allFissures.filter((f: WarframeFissure) => f.isHard);
    
    const embed = new EmbedBuilder()
        .setTitle("⚔️ Steel Path Void Fissures")
        .setColor(0xFF4500)
        .setTimestamp();
    
    if (steelFissures && steelFissures.length > 0) {
        let description = `# ⚔️ Steel Path Fissures\n`;
        description += `╔═══════════════════════════════════════╗\n`;
        description += `║         ENHANCED DIFFICULTY           ║\n`;
        description += `║       🔥 ELITE CHALLENGES 🔥          ║\n`;
        description += `╚═══════════════════════════════════════╝\n\n`;
        
        const groupedFissures = steelFissures.reduce<Record<string, WarframeFissure[]>>((acc, fissure) => {
            const tier = fissure.tier || 'Unknown';
            if (!acc[tier]) acc[tier] = [];
            acc[tier].push(fissure);
            return acc;
        }, {});
        
        const sortedTiers = sortRelicTiers(Object.keys(groupedFissures));
        
        sortedTiers.forEach((tier) => {
            const tierFissures = groupedFissures[tier];
            description += `### 🔥 ${tier} Steel Path Missions\n`;
            tierFissures.forEach((fissure, index) => {
                const timeLeft = fissure.eta || "Unknown";
                const isLast = index === tierFissures.length - 1;
                const prefix = isLast ? "└─" : "├─";
                description += `${prefix} **${fissure.missionType || 'Unknown'}** • ${fissure.node || 'Unknown Node'}\n`;
                description += `${isLast ? "   " : "│  "} ⏰ \`${timeLeft}\`\n`;
            });
            description += "\n";
        });
        
        embed.setDescription(description);
    } else {
        embed.setDescription("### ⚠️ No Steel Path Fissures\nNo enhanced difficulty fissures are currently active.");
    }
    
    // Add fissure type selector for easy switching
     const fissureSelectMenu = createRow(
         new StringSelectMenuBuilder()
             .setCustomId("warframe/fissures/select")
             .setPlaceholder("⚔️ Switch Fissure Type")
             .addOptions([
                 new StringSelectMenuOptionBuilder()
                     .setLabel("Normal Fissures")
                     .setDescription("Standard void fissure missions")
                     .setValue("normal")
                     .setEmoji("🌀"),
                 new StringSelectMenuOptionBuilder()
                     .setLabel("Steel Path Fissures")
                     .setDescription("Enhanced difficulty fissures")
                     .setValue("steel")
                     .setEmoji("⚔️")
                     .setDefault(true),
                 new StringSelectMenuOptionBuilder()
                     .setLabel("Void Storms")
                     .setDescription("Railjack void fissure missions")
                     .setValue("storm")
                     .setEmoji("🌪️")
             ])
     );
     
     await interaction.editReply({
         embeds: [embed],
         components: [fissureSelectMenu, createBackButton()]
     });
 }
 
 async function handleFissuresStorm(interaction: StringSelectMenuInteraction) {
    const allFissures: WarframeFissure[] = await fetchWithSharedCache('/fissures');
    const stormFissures = allFissures.filter((f: WarframeFissure) => f.isStorm);
    
    const embed = new EmbedBuilder()
        .setTitle("🌪️ Void Storm Fissures")
        .setColor(0x9932CC)
        .setTimestamp();
    
    if (stormFissures && stormFissures.length > 0) {
        let description = `# 🌪️ Void Storm Fissures\n`;
        description += `╔═══════════════════════════════════════╗\n`;
        description += `║         RAILJACK MISSIONS             ║\n`;
        description += `║       🚀 SPACE ADVENTURES 🚀          ║\n`;
        description += `╚═══════════════════════════════════════╝\n\n`;
        
        const groupedFissures = stormFissures.reduce<Record<string, WarframeFissure[]>>((acc, fissure) => {
            const tier = fissure.tier || 'Unknown';
            if (!acc[tier]) acc[tier] = [];
            acc[tier].push(fissure);
            return acc;
        }, {});
        
        const sortedTiers = sortRelicTiers(Object.keys(groupedFissures));
        
        sortedTiers.forEach((tier) => {
            const tierFissures = groupedFissures[tier];
            description += `### 🚀 ${tier} Void Storm Missions\n`;
            tierFissures.forEach((fissure, index) => {
                const timeLeft = fissure.eta || "Unknown";
                const isLast = index === tierFissures.length - 1;
                const prefix = isLast ? "└─" : "├─";
                description += `${prefix} **${fissure.missionType || 'Unknown'}** • ${fissure.node || 'Unknown Node'}\n`;
                description += `${isLast ? "   " : "│  "} ⏰ \`${timeLeft}\`\n`;
            });
            description += "\n";
        });
        
        embed.setDescription(description);
    } else {
        embed.setDescription("### ⚠️ No Void Storms\nNo railjack void fissures are currently active.");
    }
    
    // Add fissure type selector for easy switching
     const fissureSelectMenu = createRow(
         new StringSelectMenuBuilder()
             .setCustomId("warframe/fissures/select")
             .setPlaceholder("🌪️ Switch Fissure Type")
             .addOptions([
                 new StringSelectMenuOptionBuilder()
                     .setLabel("Normal Fissures")
                     .setDescription("Standard void fissure missions")
                     .setValue("normal")
                     .setEmoji("🌀"),
                 new StringSelectMenuOptionBuilder()
                     .setLabel("Steel Path Fissures")
                     .setDescription("Enhanced difficulty fissures")
                     .setValue("steel")
                     .setEmoji("⚔️"),
                 new StringSelectMenuOptionBuilder()
                     .setLabel("Void Storms")
                     .setDescription("Railjack void fissure missions")
                     .setValue("storm")
                     .setEmoji("🌪️")
                     .setDefault(true)
             ])
     );
     
     await interaction.editReply({
         embeds: [embed],
         components: [fissureSelectMenu, createBackButton()]
     });
 }

// Nightwave handler functions
async function handleNightwaveOverview(interaction: StringSelectMenuInteraction) {
    const nightwave: WarframeNightwave = await fetchWithSharedCache('/nightwave');
    const embed = new EmbedBuilder()
        .setColor(0x00D4FF)
        .setTitle("🌙 Nightwave Overview")
        .setTimestamp();
    
    let description = `# 🌙 Nightwave: ${nightwave.tag || 'Unknown Season'}\n`;
    description += `## Season ${nightwave.season || 'Unknown'} • Phase ${nightwave.phase || 'Unknown'}\n`;
    description += `╔═══════════════════════════════════════╗\n`;
    description += `║           NIGHTWAVE STATUS            ║\n`;
    description += `╚═══════════════════════════════════════╝\n\n`;
    
    const activeChallenges = nightwave.activeChallenges || [];
    const dailyChallenges = activeChallenges.filter((c: any) => c.isDaily);
    const weeklyChallenges = activeChallenges.filter((c: any) => !c.isDaily && !c.isElite);
    const eliteChallenges = activeChallenges.filter((c: any) => c.isElite);
    
    description += `### 📊 Challenge Summary\n`;
    description += `🌅 **Daily Challenges:** ${dailyChallenges.length} active\n`;
    description += `📊 **Weekly Challenges:** ${weeklyChallenges.length} active\n`;
    description += `⭐ **Elite Challenges:** ${eliteChallenges.length} active\n\n`;
    
    description += `╔═══════════════════════════════════════╗\n`;
    description += `║ 🚀 Choose a category to view details! ║\n`;
    description += `╚═══════════════════════════════════════╝`;
    
    embed.setDescription(description);
    
    const nightwaveSelectMenu = createRow(
        new StringSelectMenuBuilder()
            .setCustomId("warframe/nightwave/select")
            .setPlaceholder("🌙 Choose Nightwave Section")
            .addOptions([
                new StringSelectMenuOptionBuilder()
                    .setLabel("Overview")
                    .setDescription("View nightwave season overview")
                    .setValue("overview")
                    .setEmoji("🌙")
                    .setDefault(true),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Daily Challenges")
                    .setDescription("View daily challenge missions")
                    .setValue("daily")
                    .setEmoji("🌅"),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Weekly Challenges")
                    .setDescription("View weekly challenge missions")
                    .setValue("weekly")
                    .setEmoji("📊"),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Elite Challenges")
                    .setDescription("View elite challenge missions")
                    .setValue("elite")
                    .setEmoji("⭐")
            ])
    );
    
    await interaction.editReply({
        embeds: [embed],
        components: [nightwaveSelectMenu, createBackButton()]
    });
}

async function handleNightwaveDaily(interaction: StringSelectMenuInteraction) {
    const nightwave: WarframeNightwave = await fetchWithSharedCache('/nightwave');
    const embed = new EmbedBuilder()
        .setColor(0xFFD700)
        .setTitle("🌅 Daily Nightwave Challenges")
        .setTimestamp();
    
    const activeChallenges = nightwave.activeChallenges || [];
    const dailyChallenges = activeChallenges.filter((c: any) => c.isDaily && c.active);
    
    let description = `# 🌅 Daily Challenges\n`;
    description += `╔═══════════════════════════════════════╗\n`;
    description += `║           DAILY MISSIONS              ║\n`;
    description += `║       🌅 REFRESH EVERY DAY 🌅         ║\n`;
    description += `╚═══════════════════════════════════════╝\n\n`;
    
    if (dailyChallenges && dailyChallenges.length > 0) {
        dailyChallenges.forEach((challenge: any, index: number) => {
            const isLast = index === dailyChallenges.length - 1;
            const prefix = isLast ? "└─" : "├─";
            description += `${prefix} **${challenge.title || 'Unknown Challenge'}**\n`;
            description += `${isLast ? "   " : "│  "} 🎁 ${challenge.reputation || 0} Standing\n`;
            if (challenge.desc) {
                description += `${isLast ? "   " : "│  "} 📝 ${challenge.desc}\n`;
            }
            description += "\n";
        });
    } else {
        description += "### ⚠️ No Daily Challenges\nNo daily challenges are currently active.";
    }
    
    embed.setDescription(description);
    
    const nightwaveSelectMenu = createRow(
        new StringSelectMenuBuilder()
            .setCustomId("warframe/nightwave/select")
            .setPlaceholder("🌙 Choose Nightwave Section")
            .addOptions([
                new StringSelectMenuOptionBuilder()
                    .setLabel("Overview")
                    .setDescription("View nightwave season overview")
                    .setValue("overview")
                    .setEmoji("🌙"),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Daily Challenges")
                    .setDescription("View daily challenge missions")
                    .setValue("daily")
                    .setEmoji("🌅")
                    .setDefault(true),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Weekly Challenges")
                    .setDescription("View weekly challenge missions")
                    .setValue("weekly")
                    .setEmoji("📊"),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Elite Challenges")
                    .setDescription("View elite challenge missions")
                    .setValue("elite")
                    .setEmoji("⭐")
            ])
    );
    
    await interaction.editReply({
        embeds: [embed],
        components: [nightwaveSelectMenu, createBackButton()]
    });
}

async function handleNightwaveWeekly(interaction: StringSelectMenuInteraction) {
    const nightwave: WarframeNightwave = await fetchWithSharedCache('/nightwave');
    const embed = new EmbedBuilder()
        .setColor(0x00CED1)
        .setTitle("📊 Weekly Nightwave Challenges")
        .setTimestamp();
    
    const activeChallenges = nightwave.activeChallenges || [];
    const weeklyChallenges = activeChallenges.filter((c: any) => !c.isDaily && !c.isElite && c.active);
    
    let description = `# 📊 Weekly Challenges\n`;
    description += `╔═══════════════════════════════════════╗\n`;
    description += `║          WEEKLY MISSIONS              ║\n`;
    description += `║      📊 REFRESH EVERY WEEK 📊         ║\n`;
    description += `╚═══════════════════════════════════════╝\n\n`;
    
    if (weeklyChallenges && weeklyChallenges.length > 0) {
        weeklyChallenges.forEach((challenge: any, index: number) => {
            const isLast = index === weeklyChallenges.length - 1;
            const prefix = isLast ? "└─" : "├─";
            description += `${prefix} **${challenge.title || 'Unknown Challenge'}**\n`;
            description += `${isLast ? "   " : "│  "} 🎁 ${challenge.reputation || 0} Standing\n`;
            if (challenge.desc) {
                description += `${isLast ? "   " : "│  "} 📝 ${challenge.desc}\n`;
            }
            description += "\n";
        });
    } else {
        description += "### ⚠️ No Weekly Challenges\nNo weekly challenges are currently active.";
    }
    
    embed.setDescription(description);
    
    const nightwaveSelectMenu = createRow(
        new StringSelectMenuBuilder()
            .setCustomId("warframe/nightwave/select")
            .setPlaceholder("🌙 Choose Nightwave Section")
            .addOptions([
                new StringSelectMenuOptionBuilder()
                    .setLabel("Overview")
                    .setDescription("View nightwave season overview")
                    .setValue("overview")
                    .setEmoji("🌙"),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Daily Challenges")
                    .setDescription("View daily challenge missions")
                    .setValue("daily")
                    .setEmoji("🌅"),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Weekly Challenges")
                    .setDescription("View weekly challenge missions")
                    .setValue("weekly")
                    .setEmoji("📊")
                    .setDefault(true),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Elite Challenges")
                    .setDescription("View elite challenge missions")
                    .setValue("elite")
                    .setEmoji("⭐")
            ])
    );
    
    await interaction.editReply({
        embeds: [embed],
        components: [nightwaveSelectMenu, createBackButton()]
    });
}

async function handleNightwaveElite(interaction: StringSelectMenuInteraction) {
    const nightwave: WarframeNightwave = await fetchWithSharedCache('/nightwave');
    const embed = new EmbedBuilder()
        .setColor(0x9932CC)
        .setTitle("⭐ Elite Nightwave Challenges")
        .setTimestamp();
    
    const activeChallenges = nightwave.activeChallenges || [];
    const eliteChallenges = activeChallenges.filter((c: any) => c.isElite && c.active);
    
    let description = `# ⭐ Elite Challenges\n`;
    description += `╔═══════════════════════════════════════╗\n`;
    description += `║          ELITE MISSIONS               ║\n`;
    description += `║       ⭐ MAXIMUM REWARDS ⭐            ║\n`;
    description += `╚═══════════════════════════════════════╝\n\n`;
    
    if (eliteChallenges && eliteChallenges.length > 0) {
        eliteChallenges.forEach((challenge: any, index: number) => {
            const isLast = index === eliteChallenges.length - 1;
            const prefix = isLast ? "└─" : "├─";
            description += `${prefix} **${challenge.title || 'Unknown Challenge'}**\n`;
            description += `${isLast ? "   " : "│  "} 🎁 ${challenge.reputation || 0} Standing\n`;
            if (challenge.desc) {
                description += `${isLast ? "   " : "│  "} 📝 ${challenge.desc}\n`;
            }
            description += "\n";
        });
    } else {
        description += "### ⚠️ No Elite Challenges\nNo elite challenges are currently active.";
    }
    
    embed.setDescription(description);
    
    const nightwaveSelectMenu = createRow(
        new StringSelectMenuBuilder()
            .setCustomId("warframe/nightwave/select")
            .setPlaceholder("🌙 Choose Nightwave Section")
            .addOptions([
                new StringSelectMenuOptionBuilder()
                    .setLabel("Overview")
                    .setDescription("View nightwave season overview")
                    .setValue("overview")
                    .setEmoji("🌙"),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Daily Challenges")
                    .setDescription("View daily challenge missions")
                    .setValue("daily")
                    .setEmoji("🌅"),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Weekly Challenges")
                    .setDescription("View weekly challenge missions")
                    .setValue("weekly")
                    .setEmoji("📊"),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Elite Challenges")
                    .setDescription("View elite challenge missions")
                    .setValue("elite")
                    .setEmoji("⭐")
                    .setDefault(true)
            ])
    );
    
    await interaction.editReply({
        embeds: [embed],
        components: [nightwaveSelectMenu, createBackButton()]
    });
}

// Invasion handler functions
async function handleInvasionCorpus(interaction: StringSelectMenuInteraction) {
    await handleInvasions(interaction, "corpus");
}

async function handleInvasionGrineer(interaction: StringSelectMenuInteraction) {
    await handleInvasions(interaction, "grineer");
}

async function handleInvasionInfested(interaction: StringSelectMenuInteraction) {
    await handleInvasions(interaction, "infested");
}

// Enhanced invasion handler with faction filtering
async function handleInvasions(interaction: StringSelectMenuInteraction, factionFilter?: string) {
    const invasions: WarframeInvasion[] = await fetchWithSharedCache('/invasions');
    const embed = new EmbedBuilder()
        .setColor(0xFF6B6B)
        .setTitle("⚔️ Active Invasions")
        .setTimestamp();
    
    let filteredInvasions = invasions;
    if (factionFilter) {
        filteredInvasions = invasions.filter((invasion: WarframeInvasion) => 
            invasion.attackingFaction?.toLowerCase().includes(factionFilter) ||
            invasion.defendingFaction?.toLowerCase().includes(factionFilter)
        );
    }
    
    if (filteredInvasions && filteredInvasions.length > 0) {
        let description = `# ⚔️ Active Galactic Conflicts${factionFilter ? ` - ${factionFilter.charAt(0).toUpperCase() + factionFilter.slice(1)}` : ''}\n`;
        description += `╔═══════════════════════════════════════╗\n`;
        description += `║          FACTION WARFARE              ║\n`;
        description += `║       ⚔️ CHOOSE YOUR SIDE ⚔️         ║\n`;
        description += `╚═══════════════════════════════════════╝\n\n`;
        
        filteredInvasions.slice(0, 10).forEach((invasion: WarframeInvasion, index: number) => {
            const completion = invasion.completion ? `${invasion.completion.toFixed(1)}%` : 'Unknown';
            const attackerReward = invasion.attackerReward?.asString || 'Unknown reward';
            const defenderReward = invasion.defenderReward?.asString || 'Unknown reward';
            
            description += `### 🌍 Conflict ${index + 1}: ${invasion.node || 'Unknown Location'}\n`;
            description += `**Progress:** \`${completion}\` completed\n\n`;
            description += `🔴 **${invasion.attackingFaction || 'Unknown'}** (Attackers)\n`;
            description += `└─ 🎁 \`${attackerReward}\`\n\n`;
            description += `🔵 **${invasion.defendingFaction || 'Unknown'}** (Defenders)\n`;
            description += `└─ 🎁 \`${defenderReward}\`\n\n`;
            description += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;
        });
        
        if (filteredInvasions.length > 10) {
            description += `### 📊 Additional Conflicts\n`;
            description += `*... and ${filteredInvasions.length - 10} more active invasions*\n\n`;
        }
        
        description += `╔═══════════════════════════════════════╗\n`;
        description += `║ ⚔️ Fight for your faction, Tenno! ⚔️  ║\n`;
        description += `╚═══════════════════════════════════════╝`;
        
        embed.setDescription(description);
    } else {
        let description = `# ⚔️ Active Galactic Conflicts${factionFilter ? ` - ${factionFilter.charAt(0).toUpperCase() + factionFilter.slice(1)}` : ''}\n`;
        description += `╔═══════════════════════════════════════╗\n`;
        description += `║          FACTION WARFARE              ║\n`;
        description += `║       ⚔️ CHOOSE YOUR SIDE ⚔️         ║\n`;
        description += `╚═══════════════════════════════════════╝\n\n`;
        description += `### 🕊️ ${factionFilter ? `No ${factionFilter.charAt(0).toUpperCase() + factionFilter.slice(1)} conflicts` : 'Peaceful Times'}\n`;
        description += `${factionFilter ? `No active invasions involving ${factionFilter} detected.` : 'No active invasions detected across the Origin System.'}\n\n`;
        description += `*${factionFilter ? `Check other factions or try again later` : 'The factions are at peace... for now'}, Tenno.*`;
        
        embed.setDescription(description);
    }
    
    const invasionSelectMenu = createRow(
        new StringSelectMenuBuilder()
            .setCustomId("warframe/invasion/select")
            .setPlaceholder("⚔️ Filter by Faction")
            .addOptions([
                new StringSelectMenuOptionBuilder()
                    .setLabel("Corpus Invasions")
                    .setDescription("View Corpus faction conflicts")
                    .setValue("corpus")
                    .setEmoji("🔵"),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Grineer Invasions")
                    .setDescription("View Grineer faction conflicts")
                    .setValue("grineer")
                    .setEmoji("🔴"),
                new StringSelectMenuOptionBuilder()
                    .setLabel("Infested Invasions")
                    .setDescription("View Infested faction conflicts")
                    .setValue("infested")
                    .setEmoji("🟢")
            ])
    );
    
    await interaction.editReply({
        embeds: [embed],
        components: [invasionSelectMenu, createBackButton()]
    });
}

async function handleArchonHunt(interaction: StringSelectMenuInteraction) {
    const archonHunt: WarframeArchonHunt = await fetchWithSharedCache('/archonHunt');
    
    if (!archonHunt || !archonHunt.active) {
        const embed = new EmbedBuilder()
            .setTitle("🏹 Archon Hunt")
            .setDescription("No active Archon Hunt at this time.")
            .setColor(0x808080)
            .setTimestamp();
            
        await interaction.editReply({
            embeds: [embed],
            components: [createBackButton()]
        });
        return;
    }
    
    const embed = new EmbedBuilder()
        .setTitle("🏹 Weekly Archon Hunt")
        .setColor(0x8B0000) // Dark red
        .setTimestamp()
        .setFooter({ text: '🏹 Archon Hunt • Weekly elite challenge', iconURL: 'https://i.imgur.com/placeholder.png' });
    
    let description = `# 🏹 Archon Hunt\n`;
    description += `╔═══════════════════════════════════════╗\n`;
    description += `║            WEEKLY CHALLENGE           ║\n`;
    description += `║         🎯 ELITE DIFFICULTY 🎯        ║\n`;
    description += `╚═══════════════════════════════════════╝\n\n`;
    
    description += `### 👹 Target Archon\n`;
    description += `**Boss:** ${archonHunt.boss || 'Unknown'}\n`;
    description += `**Faction:** ${archonHunt.faction || 'Unknown'}\n\n`;
    
    if (archonHunt.missions && archonHunt.missions.length > 0) {
        description += `### 🎯 Mission Sequence\n`;
        archonHunt.missions.forEach((mission, index) => {
            const isLast = index === archonHunt.missions!.length - 1;
            const prefix = isLast ? "└─" : "├─";
            description += `${prefix} **${mission.type || 'Unknown'}** • ${mission.node || 'Unknown Node'}\n`;
        });
    }
    
    description += `\n╔═══════════════════════════════════════╗\n`;
    description += `║ 🏆 Complete for exclusive rewards!     ║\n`;
    description += `╚═══════════════════════════════════════╝`;
    
    embed.setDescription(description);
    
    await interaction.editReply({
        embeds: [embed],
        components: [createBackButton()]
    });
}

// Incarnon Tracker Handler
async function handleIncarnon(interaction: StringSelectMenuInteraction) {
    const embed = new EmbedBuilder()
        .setTitle("⚡ Incarnon Genesis Tracker")
        .setColor(0x9932CC) // Dark orchid
        .setTimestamp()
        .setFooter({ text: '⚡ Incarnon Genesis • Weekly Steel Path Circuit Rewards', iconURL: 'https://i.imgur.com/placeholder.png' });
    
    // Calculate current week based on a known reference point
    // Using a fixed reference date when Week 1 was active
    const referenceDate = new Date('2024-01-01T00:00:00Z'); // Reference for Week 1
    const currentDate = new Date();
    
    // For demo purposes - force week 4
    // In production, remove the forceWeek variable and use only the dynamic calculation
    const forceWeek = 4; // Force week 4 for demonstration
    
    // Dynamic calculation based on current date
    const weeksSinceReference = Math.floor((currentDate.getTime() - referenceDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
    const calculatedWeek = ((weeksSinceReference % 8) + 1);
    
    // Use forced week for demo, or calculated week in production
    const currentWeek = forceWeek || calculatedWeek;
    
    // Incarnon rotation data
    const incarnonRotations: { [key: number]: { name: string; weapons: string[] } } = {
        1: {
            name: "Week 1 (A)",
            weapons: [
                "🔫 Braton Incarnon Genesis (Braton, MK1-Braton, Braton Prime, Braton Vandal)",
                "🔫 Lato Incarnon Genesis (Lato, Lato Prime, Lato Vandal)",
                "⚔️ Skana Incarnon Genesis (Skana, Skana Prime, Prisma Skana)",
                "🏹 Paris Incarnon Genesis (Paris, MK1-Paris, Paris Prime)",
                "🗡️ Kunai Incarnon Genesis (Kunai, MK1-Kunai)"
            ]
        },
        2: {
            name: "Week 2 (B)",
            weapons: [
                "🔫 Boar Incarnon Genesis (Boar, Boar Prime)",
                "🔫 Gammacor Incarnon Genesis (Gammacor, Synoid Gammacor)",
                "🔫 Angstrum Incarnon Genesis (Angstrum, Prisma Angstrum)",
                "🔫 Gorgon Incarnon Genesis (Gorgon, Gorgon Wraith, Prisma Gorgon)",
                "⚔️ Anku Incarnon Genesis"
            ]
        },
        3: {
            name: "Week 3 (C)",
            weapons: [
                "⚔️ Bo Incarnon Genesis (Bo, MK1-Bo, Bo Prime)",
                "🔫 Latron Incarnon Genesis (Latron, Latron Prime, Latron Wraith)",
                "🔫 Furis Incarnon Genesis (Furis, MK1-Furis)",
                "👊 Furax Incarnon Genesis (Furax, MK1-Furax, Furax Wraith)",
                "🔫 Strun Incarnon Genesis (Strun, MK1-Strun, Strun Prime, Strun Wraith)"
            ]
        },
        4: {
            name: "Week 4 (D)",
            weapons: [
                "🔫 Lex Incarnon Genesis (Lex, Lex Prime)",
                "⚔️ Magistar Incarnon Genesis (Magistar, Sancti Magistar)",
                "🔫 Boltor Incarnon Genesis (Boltor, Boltor Prime, Telos Boltor)",
                "🔫 Bronco Incarnon Genesis (Bronco, Bronco Prime)",
                "🗡️ Ceramic Dagger Incarnon Genesis"
            ]
        },
        5: {
            name: "Week 5 (E)",
            weapons: [
                "🔫 Torid Incarnon Genesis",
                "🔫 Dual Toxocyst Incarnon Genesis",
                "⚔️ Dual Ichor Incarnon Genesis",
                "🔫 Miter Incarnon Genesis",
                "🔫 Atomos Incarnon Genesis"
            ]
        },
        6: {
            name: "Week 6 (F)",
            weapons: [
                "⚔️ Ack & Brunt Incarnon Genesis",
                "🔫 Soma Incarnon Genesis (Soma, Soma Prime)",
                "🔫 Vasto Incarnon Genesis (Vasto, Vasto Prime)",
                "⚔️ Nami Incarnon Genesis (Solo only)",
                "🔫 Burston Incarnon Genesis (Burston, Burston Prime)"
            ]
        },
        7: {
            name: "Week 7 (G)",
            weapons: [
                "🔫 Zylok Incarnon Genesis (Zylok, Zylok Prime)",
                "⚔️ Sibear Incarnon Genesis",
                "🏹 Dread Incarnon Genesis",
                "🗡️ Despair Incarnon Genesis",
                "⚔️ Hate Incarnon Genesis"
            ]
        },
        8: {
            name: "Week 8 (H)",
            weapons: [
                "🔫 Dera Incarnon Genesis (Dera, Dera Vandal)",
                "🔫 Cestra Incarnon Genesis",
                "⚔️ Okina Incarnon Genesis (Okina, Okina Prime)",
                "🔫 Sybaris Incarnon Genesis (Dex Sybaris, Sybaris, Sybaris Prime)",
                "🔫 Sicarus Incarnon Genesis (Sicarus, Sicarus Prime)"
            ]
        }
    };
    
    const currentRotation = incarnonRotations[currentWeek];
    
    let description = `# ⚡ Steel Path Circuit - Incarnon Genesis Tracker
`;
    description += `╔═══════════════════════════════════════╗
`;
    description += `║        INCARNON GENESIS ROTATION       ║
`;
    description += `║      ⚡ TRANSFORM YOUR ARSENAL ⚡       ║
`;
    description += `╚═══════════════════════════════════════╝\n\n`;
    
    description += `## 🗓️ Current Week: **${currentRotation.name}**\n`;
    description += `### 📋 Available Incarnon Genesis Adapters:\n\n`;
    
    currentRotation.weapons.forEach((weapon, index) => {
        description += `**${index + 1}.** ${weapon}\n`;
    });
    
    description += `\n### 📊 **How to Obtain:**\n`;
    description += `• Complete **Steel Path Circuit** in Duviri\n`;
    description += `• Select **2 out of 5** available adapters as rewards\n`;
    description += `• Reach **Tier 5** and **Tier 10** for your chosen rewards\n`;
    description += `• Requires **Pathos Clamps** and other Duviri resources\n\n`;
    
    description += `### ⏰ **Rotation Schedule:**\n`;
    
    // Show next few weeks
    for (let i = 1; i <= 4; i++) {
        const weekNum = ((currentWeek - 1 + i) % 8) + 1;
        const rotation = incarnonRotations[weekNum];
        const isNext = i === 1;
        description += `${isNext ? '**➡️' : '📅'} ${rotation.name}${isNext ? ' (Next Week)**' : ''}\n`;
    }
    
    description += `\n### 💡 **Pro Tips:**\n`;
    description += `• Plan ahead - rotation repeats every **8 weeks**\n`;
    description += `• We recommend focusing on the following weapons first since they are easier to build: **Torid**,**Ceramic Dagger**\n`;
    description += `• Stock up on **Pathos Clamps** from Orowyrm fights\n`;
    description += `• Consider Riven disposition for older weapons\n\n`;
    
    description += `╔═══════════════════════════════════════╗\n`;
    description += `║ ⚡ Transform classic weapons into      ║\n`;
    description += `║    endgame-viable powerhouses!        ║\n`;
    description += `╚═══════════════════════════════════════╝`;
    
    embed.setDescription(description);
    
    await interaction.editReply({
        embeds: [embed],
        components: [createBackButton()]
    });
}

async function handleSortie(interaction: StringSelectMenuInteraction) {
    const sortie: WarframeSortie = await fetchWithSharedCache('/sortie');
    
    const embed = new EmbedBuilder()
        .setTitle("🎯 Daily Sortie")
        .setColor(0x4B0082) // Indigo
        .setTimestamp()
        .setFooter({ text: '🎯 Daily Sortie • High-level challenge missions', iconURL: 'https://i.imgur.com/placeholder.png' });
    
    let description = `# 🎯 Daily Sortie\n`;
    description += `╔═══════════════════════════════════════╗\n`;
    description += `║            DAILY CHALLENGE            ║\n`;
    description += `║         🏆 HIGH DIFFICULTY 🏆         ║\n`;
    description += `╚═══════════════════════════════════════╝\n\n`;
    
    if (sortie?.boss) {
        description += `### 👹 Sortie Boss\n`;
        description += `**${sortie.boss}**\n\n`;
    }
    
    if (sortie?.variants && sortie.variants.length > 0) {
        description += `### 🎯 Mission Sequence\n`;
        sortie.variants.forEach((variant, index) => {
            const isLast = index === sortie.variants!.length - 1;
            const prefix = isLast ? "└─" : "├─";
            description += `${prefix} **${variant.missionType || 'Unknown'}** • ${variant.node || 'Unknown Node'}\n`;
            description += `${isLast ? "   " : "│  "} 🔧 ${variant.modifier || 'No modifier'}\n`;
            if (variant.modifierDescription) {
                description += `${isLast ? "   " : "│  "} 📝 ${variant.modifierDescription}\n`;
            }
            if (!isLast) description += "│\n";
        });
    } else {
        description += `### ⚠️ No Sortie Available\n`;
        description += `No daily sortie is currently active.\n`;
    }
    
    description += `\n╔═══════════════════════════════════════╗\n`;
    description += `║ 🎁 Complete for rare rewards!          ║\n`;
    description += `╚═══════════════════════════════════════╝`;
    
    embed.setDescription(description);
    
    await interaction.editReply({
        embeds: [embed],
        components: [createBackButton()]
    });
}

async function handleCycles(interaction: StringSelectMenuInteraction) {
    // Fetch cycle data from all open worlds using shared cache
    const [cetusCycle, vallisCycle, cambionCycle, earthCycle, zarimanCycle, duviriCycle] = await Promise.all([
        fetchWithSharedCache('/cetusCycle').catch(() => null),
        fetchWithSharedCache('/vallisCycle').catch(() => null),
        fetchWithSharedCache('/cambionCycle').catch(() => null),
        fetchWithSharedCache('/earthCycle').catch(() => null),
        fetchWithSharedCache('/zarimanCycle').catch(() => null),
        fetchWithSharedCache('/duviriCycle').catch(() => null)
    ]);
    
    const embed = new EmbedBuilder()
        .setTitle("🌍 World Cycles")
        .setColor(0x228B22) // Forest green
        .setTimestamp()
        .setFooter({ text: '🌍 World Cycles • Day/Night cycles across the Origin System', iconURL: 'https://i.imgur.com/placeholder.png' });
    
    let description = `# 🌍 Origin System Cycles\n`;
    description += `╔═══════════════════════════════════════╗\n`;
    description += `║           WORLD TIMERS                ║\n`;
    description += `║         🕐 CYCLE STATUS 🕐            ║\n`;
    description += `╚═══════════════════════════════════════╝\n\n`;
    
    // Earth Cycle
    if (earthCycle) {
        const isDay = earthCycle.isDay;
        description += `### 🌍 Earth\n`;
        description += `**Status:** ${isDay ? '☀️ Day' : '🌙 Night'}\n`;
        description += `**Time Left:** ${earthCycle.timeLeft || 'Unknown'}\n\n`;
    }
    
    // Cetus Cycle
    if (cetusCycle) {
        const isDay = cetusCycle.isDay;
        description += `### 🏜️ Cetus (Plains of Eidolon)\n`;
        description += `**Status:** ${isDay ? '☀️ Day' : '🌙 Night'}\n`;
        description += `**Time Left:** ${cetusCycle.timeLeft || 'Unknown'}\n\n`;
    }
    
    // Vallis Cycle
    if (vallisCycle) {
        const isWarm = vallisCycle.isWarm;
        description += `### ❄️ Orb Vallis\n`;
        description += `**Status:** ${isWarm ? '🔥 Warm' : '❄️ Cold'}\n`;
        description += `**Time Left:** ${vallisCycle.timeLeft || 'Unknown'}\n\n`;
    }
    
    // Cambion Cycle
    if (cambionCycle) {
        description += `### 🔮 Deimos (Cambion Drift)\n`;
        description += `**Status:** ${cambionCycle.active || 'Unknown'}\n`;
        description += `**Time Left:** ${cambionCycle.timeLeft || 'Unknown'}\n\n`;
    }
    
    // Zariman Cycle
    if (zarimanCycle) {
        description += `### 🚀 Zariman Ten Zero\n`;
        description += `**Status:** ${zarimanCycle.state || 'Unknown'}\n`;
        description += `**Time Left:** ${zarimanCycle.timeLeft || 'Unknown'}\n\n`;
    }
    
    // Duviri Cycle
    if (duviriCycle) {
        description += `### 🎭 Duviri Paradox\n`;
        description += `**Spiral:** ${duviriCycle.state || 'Unknown'}\n`;
        if (duviriCycle.expiry) {
            const timeLeft = new Date(duviriCycle.expiry).getTime() - Date.now();
            const hours = Math.floor(timeLeft / (1000 * 60 * 60));
            const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
            description += `**Time Left:** ${hours}h ${minutes}m\n`;
        }
    }
    
    description += `\n╔═══════════════════════════════════════╗\n`;
    description += `║ ⏰ Plan your activities accordingly!   ║\n`;
    description += `╚═══════════════════════════════════════╝`;
    
    embed.setDescription(description);
    
    await interaction.editReply({
        embeds: [embed],
        components: [createBackButton()]
    });
}