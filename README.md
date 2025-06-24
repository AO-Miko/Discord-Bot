# Discord Bot Beta 0.5 🤖

A versatile Discord bot featuring Warframe game information, bot notifications management, and administrative tools. Built with TypeScript and includes a Fastify web server for health monitoring.

---

## ✨ Key Features

### Core Commands
- **Warframe Information** (`/warframe`)  
  Get live Warframe game data including alerts, events, and world state information from the Warframe API.
- **Bot Notifications** (`/bot_notification`)  
  Unified command to configure and manage bot notification settings for your server (Administrator permission required).  
  - `action: add` - Add a notification channel
  - `action: edit` - Edit the notification channel
  - `action: remove` - Remove notifications
  - `action: status` - View current notification settings
- **Category Permissions** (`/categorypermissionedit`)  
  Edit permissions for Discord categories (Administrator permission required).

### Technical Highlights
- **Smart Caching**  
  Caches Warframe API responses for 60 seconds to reduce load and improve performance.
- **Robust Error Handling**  
  Automatic retries and fallback mechanisms for API failures with cached data support.
- **Interactive UI**  
  Slash commands with dropdown menus and buttons for smooth navigation.
- **Web Status Endpoint**  
  Fastify server provides health check and bot status information.
- **TypeScript & Zod**  
  Full type safety and schema validation for configurations and API responses.
- **Streamlined Configuration**  
  JSON-based configuration storage with automatic guild management and clean logging.
- **Permission-Based Access**  
  Administrative commands require proper Discord permissions with real-time validation.

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js** v18 or newer  
- A **Discord Bot Token**
- **Administrator permissions** in Discord servers for full functionality

### 2. Clone & Install
```bash
git clone <repo-url>
cd discord-bot-beta-05
npm install
```

### 3. Configure
```bash
cp .env.example .env
# Edit .env:
#   BOT_TOKEN=your_discord_token
#   SERVER_PORT=3000
#   WEBHOOK_LOGS_URL=<optional_logging_webhook>
#   BOT_OWNER_ID=<optional_bot_owner_id>
```

### 4. Run
```bash
# Development (hot reload)
npm run dev

# Development with .env.dev file
npm run dev:dev

# Watch mode
npm run watch

# Production
npm run build
npm start
```

---

## 📋 Available Scripts

| Command             | What It Does                                |
|---------------------|---------------------------------------------|
| `npm run dev`       | Start in dev mode with .env file           |
| `npm run dev:dev`   | Start in dev mode with .env.dev file       |
| `npm run watch`     | Watch mode with hot reload (.env)          |
| `npm run watch:dev` | Watch mode with hot reload (.env.dev)      |
| `npm run build`     | Compile TypeScript for production          |
| `npm start`         | Run the compiled bot with .env             |
| `npm run start:dev` | Run the compiled bot with .env.dev         |
| `npm run check`     | Only run TypeScript type checks            |

---

## 🏗️ Project Layout

```
src/
├── discord/
│   ├── base/            # Discord.js client setup and utilities
│   ├── commands/        # Slash commands
│   │   └── public/      # Public commands (warframe, botNotification, etc.)
│   ├── events/          # Discord event handlers
│   └── responders/      # Button & menu interaction handlers
├── functions/
│   ├── botNotifications.ts  # Bot notification management logic
│   └── handlers/        # Various handler functions
├── server/
│   ├── routes/          # Fastify route definitions
│   │   └── home.ts      # GET / status endpoint
│   └── index.ts         # Fastify server bootstrap
├── settings/
│   ├── env.schema.ts    # Zod schema for environment variables
│   ├── env.validate.ts  # Environment validation
│   ├── logger.ts        # Logging configuration
│   └── global.ts        # Global settings
└── index.ts             # Main application entrypoint
```

---

## 🌐 API Endpoint

### `GET /`
Returns JSON with bot status information:
- **message** – Bot status (e.g., "🍃 Online on discord as BotName")
- **guilds** – Number of connected Discord servers
- **users** – Total cached users

**Example Response:**
```json
{
  "message": "🍃 Online on discord as DiscordBot",
  "guilds": 5,
  "users": 1250
}
```

---

## ⚙️ Configuration Variables

| Name              | Required | Default | Description                             |
|-------------------|:--------:|:-------:|-----------------------------------------|
| `BOT_TOKEN`       | ✅       | —       | Your Discord bot token                  |
| `SERVER_PORT`     | ❌       | 3000    | Port for the Fastify web server        |
| `WEBHOOK_LOGS_URL`| ❌       | —       | Discord webhook URL for logging (optional) |
| `BOT_OWNER_ID`    | ❌       | —       | Discord user ID of the bot owner        |

---

## 🎮 Warframe Integration

The bot integrates with the [Warframe API](https://api.warframestat.us/) to provide:
- Real-time game alerts and events
- World state information
- Cached responses for optimal performance
- Error handling with fallback to cached data

---

## 🔧 Development Guide

### Add a Slash Command
1. Create `src/discord/commands/public/yourCommand.ts`
2. Use the command helper:
   ```ts
   import { createCommand } from "#base";
   import { ApplicationCommandType } from "discord.js";

   createCommand({
     name: "yourcommand",
     description: "What this command does",
     type: ApplicationCommandType.ChatInput,
     global: true, // Set to false for guild-only commands
     async run(interaction) {
       // Your command logic here
       await interaction.reply("Hello World!");
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
       await interaction.reply("Button clicked!");
     }
   });
   ```

### Bot Notifications System
The bot includes a comprehensive notification system that:
- **Unified Command Interface**: Single `/bot_notification` command with action-based options
- **Persistent Storage**: Configuration stored in `bot_notifications.json`
- **Per-Guild Settings**: Individual notification settings for each Discord server
- **Permission-Based**: Requires administrator permissions to configure
- **Smart Validation**: Automatic channel permission checking and validation
- **Clean Logging**: Streamlined logging without verbose operational messages
- **Auto-Cleanup**: Automatically removes configurations for servers the bot leaves

---

## 🏃‍♂️ Running the Bot

### Development Environment
```bash
# Using .env file
npm run dev

# Using .env.dev file (for separate dev environment)
npm run dev:dev

# Watch mode for automatic restarts
npm run watch
```

### Production Environment
```bash
# Build the project
npm run build

# Start the bot
npm start
```

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes and test them
4. Commit your changes: `git commit -m "Add my feature"`
5. Push to the branch: `git push origin feature/my-feature`
6. Open a Pull Request

---

## 📦 Dependencies

### Main Dependencies
- **discord.js** - Discord API wrapper
- **fastify** - Fast web framework
- **zod** - TypeScript-first schema validation
- **@magicyan/discord** - Discord.js utilities
- **chalk** - Terminal styling
- **dotenv** - Environment variable loading

### Development Dependencies
- **typescript** - TypeScript compiler
- **tsx** - TypeScript execution engine
- **tsup** - TypeScript bundler

---

## 📝 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

---

## 📊 Project Info

- **Version**: 1.2.8 (Base Version)
- **Package Name**: discord-bot-beta-05
- **Type**: ESM Module
- **Main Entry**: build/index.js
