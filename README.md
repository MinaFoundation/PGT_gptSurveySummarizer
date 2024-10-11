# gptSurveySummarizer

A Discord bot for conducting natural language surveys, inspired by and in the style of [talk to the city](https://github.com/AIObjectives/talk-to-the-city-reports).

## Features

- Create single and multi-question surveys
- Automatic summarization using GPT
- View raw survey data and summaries
- Edit existing surveys
- Auto-post survey responses
- Docker support for easy deployment

## Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/MinaFoundation/PGT_gptSurveySummarizer.git
   cd PGT_gptSurveySummarizer
   ```

2. Set up environment variables (see [Environment Setup](#environment-setup))

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the bot:
   ```bash
   npm run bot
   ```

5. Start the summarizer:
   ```bash
   npm run summarizer
   ```

For detailed setup instructions, please refer to our [Setup Guide](SETUP.md).

## Environment Setup

Create a `.env.local` file with the following variables:

```shell
DISCORD_TOKEN=your_discord_token
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

## Available Scripts

- `npm test`: Run tests
- `npm run bot`: Start the main bot
- `npm run dev`: Start the bot in development mode with Nodemon
- `npm run summarizer`: Start the GPT summarization script
- `npm run prettier`: Format code using Prettier
- `npm run reset`: Reset the Redis database

## Commands

- `/gptsurvey create`: Create a single question survey
- `/gptsurvey create-multi-response`: Create a multi-question survey
- `/gptsurvey respond`: Post an active survey in another channel
- `/gptsurvey view`: View raw survey responses
- `/gptsurvey summary`: Show survey summaries
- `/gptsurvey edit`: Edit an existing survey
- `/gptsurvey set-status`: Activate or deactivate a survey
- `/gptsurvey delete`: Delete a survey
- `/gptsurvey info`: Check bot version
- `/gptsurvey start-auto-post`: Start auto-posting responses
- `/gptsurvey stop-auto-post`: Stop auto-posting responses

For detailed command usage, refer to the [Commands section](#commands) below.

## Docker Support

Build the image:
```bash
docker build -t gptsurveybot:latest .
```

Run the bot:
```bash
docker run -it -d --env-file ./.env gptsurveybot:latest bot
```

Run the summarizer:
```bash
docker run -it -d --env-file ./.env gptsurveybot:latest summarizer
```

Test with docker-compose:
```bash
docker-compose up --build
```

## Project Structure

```
gptSurveySummarizer/
├── src/
│   ├── commands/
│   ├── lib/
│   ├── bot.ts
│   ├── config.js
│   ├── constants.ts
│   ├── logger.js
│   ├── prompts.js
│   ├── redisReset.ts
│   └── summarizer.js
├── test/
├── .env.local
├── Dockerfile
├── README.md
├── SETUP.md
└── package.json
```

## Contributing

1. Create an issue with a user story
2. Get the issue tested by Cristina Echeverry
3. Get approval from product owners (es92 or Cristina Echeverry)
4. Submit a PR corresponding to the approved issue
5. Get PR approval from code owners and Mina devops

## License

[MIT License](LICENSE)

## Support

For questions or support, join our [Discord server](https://discord.gg/2cmxYYMyHN).