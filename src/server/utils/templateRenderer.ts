import { readFileSync } from 'fs';
import { join } from 'path';

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
            // Use process.cwd() to get the project root and build path from there
            const templatePath = join(process.cwd(), 'src', 'server', 'templates', `${templateName}.html`);
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