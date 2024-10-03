# Step 1: Environment Setup

## A. Discord Developer Portal

- Create a Discord Account: If you haven’t already, sign up for a Discord account at [Discord](https://discord.com/).
- Create a New Application:
- Visit the Discord Developer Portal.
- Click on the "New Application" button.
- Name your application and create it.
- Create a Bot User:
- In your application settings, navigate to the "Bot" tab and click "Add Bot".
- Customize your bot as needed (username, icon).
- Copy Your Bot Token:
- Still under the "Bot" tab, find your Token and click "Copy". Keep this safe; you'll need it later

## B. OpenAI Account

- Sign Up with OpenAI: Create an account at OpenAI if you don't have one.
- Access Your API Key:
- Navigate to the API section and copy your API key for later use.

## C. Redis Setup

- Go to [Redis](https://redis.io/) and create an account.
- Create a db and click `connect` copy and paste your password, socket and port into .env.local file

# Step 2: Project Initialization

## A. Node.js and NPM

- Install Node.js: Download and install Node.js (including NPM) from Node.js official website.

## B. Initialize Your Project

- Create a Project Directory: Choose a location for your project and create a directory for it.
- Open a Terminal/Command Prompt: Navigate to your project directory.
- Initialize NPM:
- Run `npm init` and follow the prompts to create a package.json file.
- Install Dependencies:
- Run `npm install discord.js @discordjs/rest @discordjs/builders redis openai dotenv`.

# Step 3: Environment Variables:

- Create a .env file in your project root.
- Add your Discord Bot Token, OpenAI API Key, and Redis connection details (if applicable). Example:
  DISCORD_TOKEN=<Your Discord Bot Token>
  OPENAI_API_KEY=<Your OpenAI API Key>
  CLIENT_ID=<Your Discord Application Client ID> (It's available in the [Discord Developer Portal](https://discord.com/developers/applications/)
  GUILD_ID=<Your Discord Server (Guild) ID> (To get the Guild ID, you must ensure that "Developer Mode" is enabled in your Discord client settings)
  REDIS_URL=redis://localhost:6379

## Finding the Client ID

- Navigate to the [Discord Developer Portal](https://discord.com/developers/applications/)
- Select Your Application: Click on the application you created for your bot.
- Locate the Client ID:
- Under the "Application" section (usually the first page you land on after selecting your application), you will find your Client ID. It's a long string of numbers.
- Click the "Copy" button next to the Client ID to copy it to your clipboard.

## Finding the Guild ID (Server ID)

To get the Guild ID, you must ensure that "Developer Mode" is enabled in your Discord client settings.

### Enabling Developer Mode

- Open Discord Settings: Click on the gear icon next to your username at the bottom left corner of the Discord interface.
- Access Advanced Settings: In the left sidebar, scroll down and select "Advanced" under the "App Settings" section.
- Enable Developer Mode: Toggle the "Developer Mode" switch to the on position.

### Copying the Guild ID

- Right-Click Your Server Icon:
- After enabling Developer Mode, go back to the server list on the left side of the Discord interface.
- Right-click the server (guild) where you intend to use the bot.
- Select 'Copy ID': At the bottom of the context menu, click "Copy ID" to copy the Guild ID to your clipboard.

# Step 4: Registering Slash Commands

- Use the Discord.js guide to register your slash commands either globally or to a specific guild for testing. The command registration can be part of your bot startup process or a separate script.

# Step 5: Running Your Bot

- Start Your Bot:
- In your terminal/command prompt, navigate to your project directory.
- Run `node bot.js` to start your bot.
- Invite Your Bot to Your Server:
- In the Discord Developer Portal, under your application's "OAuth2" settings, generate an invite link with the necessary bot permissions.
- Use the generated link to invite your bot to your server.

# Step 6: Set Up Redis

- Ensure Redis is running and accessible. If you installed Redis locally, it should be available at `redis://localhost:6379`. For remote instances, configure according to your provider's instructions.

# Step 7: Testing Your Setup

- Test your bot on your Discord server by using the registered slash commands to create, list, and respond to surveys.
- Monitor the Redis database to ensure data is being saved and retrieved correctly.

# Step 8: Final Checks

- Ensure all environment variables are correctly set.
- Confirm that your bot has the necessary permissions on your Discord server to read messages, send messages, and manage interactions.
