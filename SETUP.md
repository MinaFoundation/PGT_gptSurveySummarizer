# Setup Guide for gptSurveySummarizer

This guide will walk you through the process of setting up the gptSurveySummarizer Discord bot.

## Prerequisites

- Node.js (v14 or later)
- npm (usually comes with Node.js)
- Redis server (local or cloud-hosted)
- Discord account
- OpenAI account

## Step 1: Discord Developer Portal Setup

1. Create a Discord account if you don't have one at [Discord](https://discord.com/).
2. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
3. Click "New Application" and give it a name.
4. Navigate to the "Bot" tab and click "Add Bot".
5. Customize your bot (username, icon).
6. Under the "Token" section, click "Copy" to copy your bot token.

## Step 2: OpenAI API Setup

1. Sign up for an OpenAI account at [OpenAI](https://openai.com/).
2. Navigate to the API section and create a new API key.
3. Copy the API key for later use.

## Step 3: Redis Setup

1. Sign up for a Redis account at [Redis](https://redis.io/) (or set up a local Redis server).
2. Create a new database.
3. Note down the connection details (host, port, password).

## Step 4: Project Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/MinaFoundation/PGT_gptSurveySummarizer.git
   cd PGT_gptSurveySummarizer
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Create a `.env.local` file in the project root with the following content:
   ```
   DISCORD_TOKEN=your_discord_bot_token
   OPENAI_API_KEY=your_openai_api_key
   REDIS_HOST=your_redis_host
   REDIS_PORT=your_redis_port
   REDIS_PASSWORD=your_redis_password
   CLIENT_ID=your_discord_client_id
   GUILD_ID=your_discord_guild_id
   GSS_LOG_LEVEL=INFO
   SUMMARIZE_FREQUENCY_SECONDS=3600
   POST_CHANNEL_ID=your_forum_channel_id
   ```

   Replace the placeholders with your actual values.

## Step 5: Finding Discord IDs

### Client ID
1. Go to the [Discord Developer Portal](https://discord.com/developers/applications).
2. Select your application.
3. Copy the "Client ID" from the "General Information" tab.

### Guild ID
1. Enable Developer Mode in Discord (User Settings > Advanced > Developer Mode).
2. Right-click on your server and select "Copy ID".

## Step 6: Registering Slash Commands

1. Run the command registration script:
   ```bash
   node src/registerCommands.js
   ```

## Step 7: Inviting the Bot to Your Server

1. Go to the OAuth2 > URL Generator tab in the Discord Developer Portal.
2. Select the "bot" and "applications.commands" scopes.
3. Select the necessary bot permissions.
4. Copy the generated URL and open it in a browser to invite the bot to your server.

## Step 8: Running the Bot

1. Start the main bot:
   ```bash
   npm run bot
   ```

2. Start the summarizer in a separate terminal:
   ```bash
   npm run summarizer
   ```

## Troubleshooting

- Ensure all environment variables are correctly set in the `.env.local` file.
- Check that your bot has the necessary permissions in your Discord server.
- Verify that your Redis connection is working properly.

For additional help, join our [Discord server](https://discord.gg/2cmxYYMyHN).