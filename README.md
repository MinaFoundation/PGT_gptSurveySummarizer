# gptSurveySummarizer

A discord bot for natural language surveys, inspired by and in the style of [talk to the city](https://github.com/AIObjectives/talk-to-the-city-reports).

## Usage

1. Create a .env file with the following variables: 

    ```shell
    DISCORD_TOKEN=
    OPENAI_API_KEY=
    REDIS_URL=  # Optional
    CLIENT_ID=
    GUILD_ID=
    SUMMARIZE_FREQUENCY_SECONDS=3600
    ```

1. Run `npm install`
2. Start redis with `redis-server`
3. Start the main bot script with `node bot.js`
4. Start the gpt summarization script with `node summarizer.js`

## Example Survey

TODO
