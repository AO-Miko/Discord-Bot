# Discord Warframe Bot 🎮

A fast, interactive Discord bot that delivers live Warframe information straight to your server. It also includes a Fastify web server for health checks and status.

---

## ✨ Key Features

### Game Info Modules
- **Void Fissures**  
  See all active relic missions, filtered by era (Lith, Meso, Neo, Axi).
- **Nightwave**  
  Track current series challenges, your progress, and available rewards.
- **Invasions**  
  Monitor faction wars and choose which reward you want.
- **Archon Hunt**  
  Check the weekly rotation of these high-end missions.
- **Daily Sortie**  
  View today’s three-mission challenge bundle.
- **World Cycles**  
  Keep an eye on Cetus, Fortuna, and Cambion Drift day/night cycles.
- **Incarnon Tracker**  
  See which Incarnon weapons are available this week.
- **Alerts**  
  List all time‑limited missions happening right now.
- **Events**  
  Stay up to date on special in‑game events.

### Technical Highlights
- **Smart Caching**  
  Caches API responses for 60 seconds to reduce load.
- **Robust Error Handling**  
  Automatic retries and clear fallback messages if the API fails.
- **Interactive UI**  
  Slash commands, dropdown menus, and buttons make navigation smooth.
- **Web Status Endpoint**  
  Fastify server provides a `GET /` route showing bot health.
- **TypeScript & Zod**  
  Full type safety and schema validation for all configs and responses.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** v18 or newer  
- A **Discord Bot Token**

### 2. Clone & Install
```bash
git clone <repo-url>
cd discord-warframe-bot
npm install
```

### 3. Configure
```bash
cp .env.example .env
# Edit .env:
#   BOT_TOKEN=your_discord_token
#   SERVER_PORT=8080
#   WEBHOOK_LOGS_URL=<optional_logging_webhook>
```

### 4. Run
```bash
# Development (hot reload)
npm run dev

# Production
npm run build
npm start
```

---

## 📋 Available Scripts

| Command           | What It Does                                |
|-------------------|---------------------------------------------|
| `npm run dev`     | Start in dev mode with hot reload           |
| `npm run watch`   | Rebuild on file changes                     |
| `npm run build`   | Compile TypeScript for production           |
| `npm start`       | Run the compiled bot                        |
| `npm run check`   | Only run TypeScript type checks             |

---

## 🏗️ Project Layout

```
src/
├── discord/
│   ├── base/            # Discord.js client setup
│   ├── commands/        # Slash commands (e.g., warframe.ts)
│   ├── events/          # Event handlers
│   └── responders/      # Button & menu logic
├── server/
│   ├── routes/home.ts   # GET / status endpoint
│   └── index.ts         # Fastify server bootstrap
├── settings/
│   ├── env.schema.ts    # Zod schema for .env
│   └── logger.ts        # Pino logger setup
└── index.ts             # Main entrypoint
```

---

## 🌐 API Endpoint

### `GET /`
Returns JSON with:
- **message** – Bot status (e.g., “🍃 Online as WarframeBot”)
- **guilds** – Number of connected servers
- **users** – Total cached users

**Example:**
```json
{
  "message": "🍃 Online as WarframeBot",
  "guilds": 12,
  "users": 3450
}
```

---

## ⚙️ Configuration Variables

| Name              | Required | Default | Description                             |
|-------------------|:--------:|:-------:|-----------------------------------------|
| `BOT_TOKEN`       | ✅       | —       | Your Discord bot token                  |
| `SERVER_PORT`     | ❌       | 3000    | Port for the web server                 |
| `WEBHOOK_LOGS_URL`| ❌       | —       | Discord webhook URL for logging (optional) |
| `NODE_OPTIONS`    | ❌       | —       | Extra Node.js runtime flags             |

---

## 🔧 Development Guide

### Add a Slash Command
1. Create `src/discord/commands/public/yourCommand.ts`.  
2. Use the helper:
   ```ts
   import { createCommand } from "#base";
   import { ApplicationCommandType } from "discord.js";

   createCommand({
     name: "yourcommand",
     description: "What this command does",
     type: ApplicationCommandType.ChatInput,
     async run(interaction) {
       // Your logic here
     }
   });
   ```

### Add a Button or Menu Responder
1. In `src/discord/responders/`, add a new file:
   ```ts
   import { createResponder, ResponderType } from "#base";

   createResponder({
     customId: "my-button-id",
     type: ResponderType.Button, // or SelectMenu
     async run(interaction) {
       // Handle interaction
     }
   });
   ```

---

## 🤝 Contributing

1. Fork the repo  
2. Create a branch: `git checkout -b feature/my-feature`  
3. Commit: `git commit -m "Add my feature"`  
4. Push: `git push origin feature/my-feature`  
5. Open a Pull Request  

---

## 🔮 Roadmap

- Custom notifications  
- Multi-language support  
- Advanced filtering options  
- Mobile‑friendly web dashboard  

---

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.
