# gptSurveySummarizer

A discord bot for natural language surveys, inspired by and in the style of [talk to the city](https://github.com/AIObjectives/talk-to-the-city-reports).

Join the discord server for discussing and developing this tool [here](https://discord.gg/2cmxYYMyHN).

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

## Contributions

To make a contribution do the following steps:

1. Make an issue that includes a user story for what the user should be able to do (eg user should be able to view the survey summary in their local language).
2. Get that issue approved by the product owners (for now just me / Evan / es92).
3. Write a PR and get that approved by the code owners (for now also just me / Evan / es92). Each PR must correspond to an approved issue. By default PRs should be merged by the PR submitter, though in some cases if changes are needed they can be merged by code owners.
