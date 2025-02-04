# gptSurveySummarizer

A Discord bot for natural language surveys, inspired by and in the style of [talk to the city](https://github.com/AIObjectives/talk-to-the-city-reports).

Join the Discord server for discussing and developing this tool [here](https://discord.gg/2cmxYYMyHN).

## Usage

1. Create a `.env.local` file with the following variables:

   ```shell
   DISCORD_TOKEN=XXXXXXXXX
   OPENAI_API_KEY=XXXXXXXXX

   # Redis host without port
   REDIS_HOST=XXXXXX
   REDIS_PORT=XXXXX
   REDIS_PASSWORD=XXXXXXX
   CLIENT_ID=XXXXXXXXX
   GUILD_ID=XXXXXXXXXX

   # Log Level, DEBUG, INFO, WARN etc.
   GSS_LOG_LEVEL=XXXXX
   SUMMARIZE_FREQUENCY_SECONDS=3600

   # Discord forum channel id for posting channels.
   POST_CHANNEL_ID=XXXXX
   ADMIN_CHANNEL_ID=XXXXX

    # Server PORT
   GSS_SERVER_PORT=3000
   GSS_BOT_ADMIN_CHANNEL_ID=XXXXX
   ```

2. Run `npm install`
3. Fill in the REDIS_HOST, REDIS_PORT, and REDIS_PASSWORD for connecting your Redis DB:
   - Go to [Redis](https://redis.io/) and create an account.
   - Create a DB and click `connect`. Copy and paste your password, socket, and port into the `.env.local` file.
   - You can see the Redis configuration in `config.js`.
4. Start the main bot script with `npm run bot`.
5. Or start the main bot script with `npm run dev` to use nodemon in the development phase.
6. Start the GPT summarization script with `npm run summarizer`.

## Scripts

Here is the section for the scripts in the README file:

The project includes several scripts to facilitate development and operations. Here is a brief explanation of each:

#### **test**

Runs the tests.

```shell
npm run test
```

#### **bot**

Starts the main bot script.

```shell
npm run bot
```

#### **dev**

Starts the main bot script in development mode using Nodemon to automatically restart the bot when changes are detected.

```shell
npm run dev
```

#### **summarizer**

Starts the GPT summarization script.

```shell
npm run summarizer
```

#### **prettier**

Formats the codebase using Prettier.

```shell
npm run prettier
```

#### **reset**

Resets the Redis database.

```shell
npm run reset
```

## Commands *(Deprecated)*

It still can be run with ```npm run commandBot```but no we have buttons UI for smooth user experience.

### /gptsurvey create

Use it to create single question surveys.

- **SURVEY TITLE:** _Max 45 Char_, _cannot include "-"_
- **SURVEY DESCRIPTION**:
- **QUESTION:** _Max 45 Char_
- **SURVEY EXPIRE TIME:** Must be `YYYY-MM-DD-HH-MM` format or can be `inf`
- **SURVEY POSTING TO FORUM CONDITION:** `true`or `false`

### /gptsurvey create-multi-response

Use it to create multiple question surveys.

- **SURVEY TITLE:** _Max 45 Char_, _cannot include "-"_
- **SURVEY DESCRIPTION**:
- **QUESTIONS:** Each line separated "\n" or `enter` is one question. Each question must be maximum 45 Char for each line. Maximum question number is `maxResponsesForMultiResponsePerUser` in constants.ts. _**However it is strongly recommended to set is maximum 5 to prevent Modal UI based problems.**_
- **SURVEY EXPIRE TIME:** Must be `YYYY-MM-DD-HH-MM` format or can be `inf`
- **SURVEY POSTING TO FORUM CONDITION:** `true`or `false`

### /gptsurvey respond

You can use this if you want to post an active survey in another channel (bot must have access to post anything on that channel).

### /gptsurvey view

To view the responses with raw data txt file.

### /gptsurvey summary

You can use this command to show people summaries of surveys. You can select summary type optionally: If "Yes", it will show high level summary of the survey. If "No", it will show general summary.

### /gptsurvey edit

Edit survey name or questions, delete questions or add questions. Once submitted, if the survey was answered, the responses will be deleted. You can also set/edit a survey start and end date, or leave it infinite. Also, you can post the survey to forum channel making ``true` the last section.

Same restrictions in `/create` command.

And if your survey in the forum channel. Do not change the title more than 2 times in 10 Minutes because of rate limit.

### /gptsurvey set-status

To activate or deactivate a survey.

### /gptsurvey delete

To delete the survey.

### /gptsurvey info

To check the version.

### /gptsurvey start-auto-post

To start auto-posting the responses view. It is working which channel that you used. For example, if you use it in forum channel, it will be activated in that channel.

### /gptsurvey stop-auto-post

To stop auto-posting the responses view. For example, if you use it in forum channel, it will be activated in that channel.

### /gptsurvey create-survey-leaderboard

Creates leaderboard by calculating respond counts of the users per survey.

### /gptsurvey edit-survey-count

To edit survey respond count of users. Username is the discord username, count is + or - count. For example: "+4", "-1", "0"

### /gptsurvey view-survey-counts

Views survey counts of users which may be edited.

### /gptsurvey view-discord-survey-counts

View survey counts of users responded only by Discord.

## Docker Image

### Build It

```shell
docker build -t <your-image-name>:<your-image-tag> .
```

### Run It

The image has two operational modes: **bot** by default and **summarizer**.

To run the bot, use the `bot` argument, and to run the summarizer, use `summarizer`.

```shell
docker run -it -d --env-file ./.env <your-image-name>:<your-image-tag> bot
```

The `--env-file` flag takes a filename as an argument and expects each line to be in the VAR=VAL format, mimicking the argument passed to `--env`. Comment lines need only be prefixed with `#`.

### Test It

```shell
docker-compose up --build
```

# Environment Setup

## Step 1: Discord Developer Portal

### A. Create a Discord Account

- Sign up for a Discord account at [Discord](https://discord.com/).

### B. Create a New Application

1. Visit the Discord Developer Portal.
2. Click on the "New Application" button.
3. Name your application and create it.

### C. Create a Bot User

1. In your application settings, navigate to the "Bot" tab and click "Add Bot".
2. Customize your bot as needed (username, icon).

### D. Copy Your Bot Token

1. Still under the "Bot" tab, find your Token and click "Copy". Keep this safe; you'll need it later.

## Step 2: OpenAI Account

1. Sign up with OpenAI: Create an account at OpenAI if you don't have one.
2. Access your API key:
   - Navigate to the API section and copy your API key for later use.

## Step 3: Redis Setup

1. Go to [Redis](https://redis.io/) and create an account.
2. Create a DB and click `connect`. Copy and paste your password, socket, and port into the `.env.local` file.

### Finding the Client ID

1. Navigate to the [Discord Developer Portal](https://discord.com/developers/applications/).
2. Select your application: Click on the application you created for your bot.
3. Locate the Client ID:
   - Under the "Application" section (usually the first page you land on after selecting your application), you will find your Client ID. It's a long string of numbers.
   - Click the "Copy" button next to the Client ID to copy it to your clipboard.

### Finding the Guild ID (Server ID)

To get the Guild ID, you must ensure that "Developer Mode" is enabled in your Discord client settings.

#### Enabling Developer Mode

1. Open Discord Settings: Click on the gear icon next to your username at the bottom left corner of the Discord interface.
2. Access Advanced Settings: In the left sidebar, scroll down and select "Advanced" under the "App Settings" section.
3. Enable Developer Mode: Toggle the "Developer Mode" switch to the on position.

#### Copying the Guild ID

1. Right-click your server icon:
   - After enabling Developer Mode, go back to the server list on the left side of the Discord interface.
   - Right-click the server (guild) where you intend to use the bot.
2. Select 'Copy ID': At the bottom of the context menu, click "Copy ID" to copy the Guild ID to your clipboard.

## Step 6: Registering Slash Commands

- Use the Discord.js guide to register your slash commands either globally or to a specific guild for testing. The command registration can be part of your bot startup process or a separate script.

## Step 7: Running Your Bot

1. Start your bot:
   - In your terminal/command prompt, navigate to your project directory.
   - Run `npm run bot` to start your bot.
2. Invite your bot to your server:
   - In the Discord Developer Portal, under your application's "OAuth2" settings, generate an invite link with the necessary bot permissions.
   - Use the generated link to invite your bot to your server.

## Step 8: Set Up Redis

- Ensure Redis is running and accessible. If you installed Redis locally, it should be available at `redis://localhost:6379`. For remote instances, configure according to your provider's instructions.

## Step 9: Testing Your Setup

- Test your bot on your Discord server by using the registered slash commands to create, list, and respond to surveys.
- Monitor the Redis database to ensure data is being saved and retrieved correctly.

## Step 10: Final Checks

- Ensure all environment variables are correctly set.
- Confirm that your bot has the necessary permissions on your Discord server to read messages, send messages, and manage interactions.

---

## Project Structure

- `commands` folder for command related codes. can be used by importing `@command/index`
- `lib` folder for other functional codes.

```
└── 📁gptSurveySummarizer
    └── .env.local
    └── .gitignore
    └── CODEOWNERS
    └── Dockerfile
    └── README.md
    └── SETUP.md
    └── docker-compose.yaml
    └── dump.rdb
    └── initial_notes.md
    └── package-lock.json
    └── package.json
    └── settings.json
    └── 📁src
        └── bot.ts
        └── 📁commands
            └── commandBuilder.ts
            └── handleAutoPost.ts
            └── handleCreate.ts
            └── handleDelete.ts
            └── handleDeleteButton.ts
            └── handleEdit.ts
            └── handleInfo.ts
            └── handleModals.ts
            └── handleRespond.ts
            └── handleRespondButton.ts
            └── handleSetStatus.ts
            └── handleSummary.ts
            └── handleView.ts
            └── index.ts
        └── config.js
        └── constants.ts
        └── 📁lib
            └── checkUpdateSurveys.js
            └── createSurvey.js
            └── deleteThreadPost.js
            └── gptClient.js
            └── index.ts
            └── makeSurveyPost.js
            └── startAutoPosting.js
            └── surveyToText.js
            └── threadPost.js
            └── updateSurvey.js
            └── updateThreadPost.js
        └── logger.js
        └── prompts.js
        └── redisReset.ts
        └── summarizer.js
    └── 📁test
        └── bot.test.js
        └── summarizer.test.js
    └── tsconfig.json
```

# API Documentation for Govbot Endpoints

It has also node server for Govbot. First 3 endpoint is used for to integrate discord Survey Summarizer. Here is the API documentation:

## Authorization

### JWT Bearer

- The API requires a JWT Bearer token for authorization.
- Algorithm: **HS256**
- Example Secret Key: `123456` _(Use environment variables to store sensitive data)._

## Endpoints

### 1. Create a Proposal

**URL**:  
`POST /api/govbot/proposal`

**Headers**:

- Content-Type: `application/json`
- Authorization: `Bearer <AUTH_SECRET>`

**Request Body (JSON)**:

```json
{
  "proposalName": "Proposal Name",
  "proposalAuthor": "eylulgurcan",
  "proposalDescription": "Long Description",
  "endTime": "2025-12-13T14:30:00.000Z"
}
```

### 2. Add Feedback to a Proposal

**URL**:  
`POST /api/govbot/proposal`

**Headers**:

- Content-Type: `application/json`
- Authorization: `Bearer <AUTH_SECRET>`

```json
{
  "proposalName": "Proposal Name",
  "username": "berkinggurcan",
  "feedbackContent": "I think this plan is not well thought out, but we dont need more focus on renewable energy. and created suprising results."
}
```

### 3. Health Check

**URL**:  
`GET /api/govbot/`

**Headers**:  
No header.

**Example Response**

```
{
    "message": "Hello Govbot!"
}
```

### 4. Health Check for Redis Integration and API

**URL**:  
`GET /api/govbot/health`

**Headers**:

- Content-Type: `application/json`
- Authorization: `Bearer <AUTH_SECRET>`

**Example Response**

```json
{
  "status": "ok",
  "redis": "connected"
}
```

### 5. Add Proposal to DB

**URL**:  
`POST /api/govbot/proposals`

**Headers**:

- Content-Type: `application/json`
- Authorization: `Bearer <AUTH_SECRET>`

**Request Body (JSON)**:

```json
{
  "proposalId": "12",
  "proposalName": "My Proposal",
  "proposalDescription": "Proposal details here...",
  "proposalAuthor": "Alice",
  "endTime": "2025-12-31T23:59:59.999Z",
  "fundingRoundId": 123
}
```

**Example Response**

```json
{
  "proposalId": "12",
  "proposalName": "My Proposal",
  "proposalDescription": "Proposal details here...",
  "proposalAuthor": "Alice",
  "endTime": "2025-12-31T23:59:59.999Z",
  "fundingRoundId": 123
}
```

### 6. Summarize Proposal by ID

**URL**:  
`POST /api/govbot/proposals/:id/summarize`

**Headers**:

- Content-Type: `application/json`
- Authorization: `Bearer <AUTH_SECRET>`

**Example Response**

```json
{
  "proposalId": "12",
  "proposalSummary": "DUMMY SUMMARY: Proposal details here......",
  "fundingRoundId": 123
}
```

### 7. Get Proposal Summary by Proposal ID

**URL**:  
`GET /api/govbot/proposals/:id/summary`

**Headers**:

- Content-Type: `application/json`
- Authorization: `Bearer <AUTH_SECRET>`

**Example Response**

```json
{
  "proposalId": "12",
  "proposalSummary": "DUMMY SUMMARY: Proposal details here......",
  "fundingRoundId": 123
}
```

## Contributions

To make a contribution, follow these steps:

1. Make an issue that includes a user story for what the user should be able to do (e.g., the user should be able to view the survey summary in their local language).
2. Get that issue tested by: Cristina Echeverry.
3. Get that issue approved by the product owners: es92 or Cristina Echeverry.
4. Write a PR and get it approved by the code owners and Mina devops: Es92 (code owner), berkingurcan (developer & codeco-owner), johnmarcou (Mina devops). Each PR must correspond to an approved issue. By default, PRs should be merged by the PR submitter, though in some cases if changes are needed, they can be merged by code owners.
