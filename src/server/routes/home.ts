import { defineRoutes } from "#server";

export default defineRoutes((app, client) => {
    // Simple HTML response
    app.get("/", (_, res) => {
        const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;
        
        const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${client.user.username} - Discord Bot</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
        </head>
        <body>
            <h1>${client.user.username} Discord Bot</h1>
            <p>Bot is online and running!</p>
            <p>Servers: ${client.guilds.cache.size}</p>
            <p>Users: ${client.users.cache.size}</p>
            <p>Ping: ${client.ws.ping}ms</p>
            <a href="${inviteUrl}">Invite Bot</a>
        </body>
        </html>
        `;
        
        return res.type('text/html').send(html);
    });

    // Keep the redirect endpoint
    app.get("/invite", (_, res) => {
        const inviteUrl = `https://discord.com/api/oauth2/authorize?client_id=${client.user.id}&permissions=8&scope=bot%20applications.commands`;
        return res.redirect(inviteUrl);
    });
});