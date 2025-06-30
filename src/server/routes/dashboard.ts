import { readFileSync } from 'fs';
import { join } from 'path';
import { StatusCodes } from "http-status-codes";
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Client } from 'discord.js';
import { defineRoutes } from '../index.js';

export interface DashboardData {
    botName: string;
    botAvatar: string;
    inviteUrl: string;
    guildsCount: number;
    usersCount: string;
    commandsCount: number;
    ping: number;
    version: string;
}

export class TemplateRenderer {
    private static templateCache: Map<string, string> = new Map();

    static renderTemplate(templateName: string, data: Record<string, any>): string {
        let template = this.templateCache.get(templateName);
        
        if (!template) {
            // Use local templates directory within routes
            const isProduction = process.env.NODE_ENV === 'production';
            const basePath = isProduction ? 'build' : 'src';
            const templatePath = join(process.cwd(), basePath, 'server', 'routes', 'templates', `${templateName}.html`);
            template = readFileSync(templatePath, 'utf-8');
            this.templateCache.set(templateName, template);
        }

        return template.replace(/\{\{(\w+)\}\}/g, (match, key) => {
            return data[key] !== undefined ? String(data[key]) : match;
        });
    }

    static renderDashboard(data: DashboardData): string {
        return this.renderTemplate('dashboard', data);
    }

    static clearCache(): void {
        this.templateCache.clear();
    }
}

export default defineRoutes((app: FastifyInstance, client: Client<true>) => {
    // API endpoint for JSON data
    app.get("/api", (_: FastifyRequest, res: FastifyReply) => {
        const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;
        
        // Available commands data
        const commands = [
            {
                name: "warframe",
                description: "Get live Warframe game data including alerts, events, and world state information",
                category: "Gaming",
                usage: "High"
            },
            {
                name: "bot_notification",
                description: "Configure and manage bot notification settings for your server",
                category: "Administration",
                usage: "Medium"
            },
            {
                name: "categorypermissionedit",
                description: "Edit permissions for Discord categories",
                category: "Administration",
                usage: "Low"
            }
        ];
        
        return res.status(StatusCodes.OK).send({
            bot: {
                name: client.user.username,
                id: client.user.id,
                avatar: client.user.displayAvatarURL({ size: 128 }),
                status: "online",
                version: "0.6.1"
            },
            stats: {
                guilds: client.guilds.cache.size,
                users: client.users.cache.size,
                commands: commands.length,
                ping: client.ws.ping
            },
            commands: commands,
            features: [
                "Warframe Integration",
                "Bot Notifications",
                "Permission Management",
                "Real-time Updates",
                "Admin Controls"
            ],
            inviteUrl: inviteUrl,
            message: `🍃 Online on discord as ${client.user.username}`
        });
    });

    // Main HTML dashboard
    app.get("/", (_: FastifyRequest, res: FastifyReply) => {
        const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;
        
        const dashboardData: DashboardData = {
            botName: client.user.username,
            botAvatar: client.user.displayAvatarURL({ size: 40 }),
            inviteUrl: inviteUrl,
            guildsCount: client.guilds.cache.size,
            usersCount: client.users.cache.size.toLocaleString(),
            commandsCount: 3,
            ping: client.ws.ping,
            version: "0.6.1"
        };
        
        const html = TemplateRenderer.renderDashboard(dashboardData);
        return res.type('text/html').send(html);
    });

    // Keep the redirect endpoint
    app.get("/invite", (_: FastifyRequest, res: FastifyReply) => {
        const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;
        return res.redirect(inviteUrl);
    });
});