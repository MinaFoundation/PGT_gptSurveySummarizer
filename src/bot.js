import 'dotenv/config'
import { interactionCreateHandler } from './handlers/bot.js';


import { Client, GatewayIntentBits, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

import { ActionRowBuilder, ModalBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SlashCommandBuilder } from '@discordjs/builders';
import { createClient } from 'redis';
import openai from 'openai';

import surveyToText from './surveyToText.js';

const summarizeFrequency = process.env.SUMMARIZE_FREQUENCY_SECONDS;

import package_json from '../package.json' with { type: 'json' };
const version = package_json.version;

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
  console.error('Unhandled exception:', error);
});

const maxResponsesForMultiResponsePerUser = 5;

(async() => {

  const is_dev = process.argv[2] == '--dev';

  const prefix = is_dev ? 'dev_' : '';

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  const create_multi_cmd = 'create-multi-response';

  const redisClient = createClient({ url: process.env.REDIS_URL });
  await redisClient.connect();

  const command = 
    new SlashCommandBuilder()
    .setName(prefix + 'gptsurvey')
    .setDescription('create, respond to, and view gpt-powered natural language surveys')
    .addSubcommand(sc => 
      sc
        .setName('create')
        .setDescription('create a new survey, with one response per user. This is best for sentiment and questions.')
    )
    .addSubcommand(sc => 
      sc
        .setName(create_multi_cmd)
        .setDescription('create a new survey, with up to 5 responses per user. This is best for brainstorming and feedback.')
    )
    .addSubcommand(sc => 
      sc
        .setName('respond')
        .setDescription('respond to a survey')
        .addStringOption(option =>
          option.setName('survey')
            .setDescription('survey name')
            .setAutocomplete(true)
            .setRequired(true)) // TODO do not allow the user to proceed until a matching option has
                                //      been selected (I've seen that in other discord bots I think)
    )
    .addSubcommand(sc => 
      sc
        .setName('view')
        .setDescription('view the summary and responses for a survey')
        .addStringOption(option =>
          option.setName('survey')
            .setDescription('survey name')
            .setAutocomplete(true)
            .setRequired(true)) // TODO do not allow the user to proceed until a matching option has
                                //      been selected (I've seen that in other discord bots I think)
    )
    .addSubcommand(sc => 
      sc
        .setName('start-auto-post')
        .setDescription('start automatically posting a survey on this channel regularly')
        .addStringOption(option =>
          option.setName('survey')
            .setDescription('survey name')
            .setAutocomplete(true)
            .setRequired(true)) // TODO do not allow the user to proceed until a matching option has
                                //      been selected (I've seen that in other discord bots I think)
    )
    .addSubcommand(sc => 
      sc
        .setName('stop-auto-post')
        .setDescription('stop automatically posting a survey on this channel regularly')
        .addStringOption(option =>
          option.setName('survey')
            .setDescription('survey name')
            .setAutocomplete(true)
            .setRequired(true)) // TODO do not allow the user to proceed until a matching option has
                                //      been selected (I've seen that in other discord bots I think)
    )
    .addSubcommand(sc => 
      sc
        .setName('info')
        .setDescription('view the version number')
    )

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: [ command.toJSON() ] },
    );
    console.log('Successfully registered commands.');
  } catch (error) {
    console.error('Error registering commands', error);
  }

  client.once('ready', () => {
    console.log('ready')
    startAutoPosting(client, redisClient);
  });

  client.on('interactionCreate', interactionCreateHandler);

  client.login(process.env.DISCORD_TOKEN);

  //await redisClient.flushAll();
  //await runTest(redisClient);
})();

const startAutoPosting = async (client, redisClient) => {
  while (true) {
    const timeSinceLastUpdate = (Date.now() % (summarizeFrequency*1000))
    const timeOfLastUpdate = Date.now() - timeSinceLastUpdate;
    const timeOfNextUpdate = timeOfLastUpdate + summarizeFrequency*1000;
    const fiveMinutes = 5*60*1000;
    const timeOfNextAutoPosting = timeOfNextUpdate + fiveMinutes;
    const timeTilNextAutoPosting = timeOfNextAutoPosting - Date.now();

    console.log(`${timeTilNextAutoPosting/1000/60} minutes until the next auto-posting`);
    await new Promise((r) => setTimeout(r, timeTilNextAutoPosting));

    console.log('starting auto posting');

    const autoPostSurveys = await redisClient.sMembers('auto-post-surveys');

    for (const autoPostSurvey of autoPostSurveys) {
      const channelId = autoPostSurvey.split(':')[0]
      const surveyName = autoPostSurvey.split(':').slice(1).join(':');

      console.log('posting', surveyName, 'to', channelId);

      const messagesToSend = await makeSurveyPost(redisClient, surveyName);
      const channel = client.channels.cache.get(channelId)

      for (const [ i, toSend ] of Object.entries(messagesToSend)) {
        if (i == 0) {
          await channel.send(toSend);
        } else {
          await channel.send(toSend);
        }
      }
    }
  }
}

const makeSurveyPost = async (redisClient, surveyName) => {
  if (!(await redisClient.sIsMember('surveys', surveyName))) {
    return [ { content: 'There is no survey with that name', ephemeral: true } ];
  } else {
    const [ msg, files ] = await surveyToText(redisClient, surveyName);

    const lines = msg.split('\n');
    const chunks = [];
    let chunk = ''
    for (const line of lines) {
      const chunkWithLine = chunk + '\n' + line;
      if (chunkWithLine.length > 2000) {
        chunks.push(chunk);
        chunk = '';
      }
      chunk = chunk + '\n' + line;
    }
    chunks.push(chunk);

    return chunks.map((chunk, i) => {
      console.log('making chunk', i, chunk.length);
      const toSend = { content: chunk };
      if (i == chunks.length - 1) {
        toSend.files = files;
      }
      return toSend;
    });
  }
}

const runTest = async (redisClient) => {
  await redisClient.flushAll();
  await createSurvey(redisClient, 'test-survey', 'single', 'test-description', 'evan');
  await respond(redisClient, 'test-survey', 'evan', 'comment1');
  await respond(redisClient, 'test-survey', 'bob', 'comment2');
}

const createSurvey = async (redisClient, surveyName, surveyType, description, username) => {
  await redisClient.sAdd('surveys', surveyName);
  const initialSummaryJSON = JSON.stringify({});
  await redisClient.set(`survey:${surveyName}:summary`, initialSummaryJSON);
  await redisClient.set(`survey:${surveyName}:type`, surveyType);
  await redisClient.set(`survey:${surveyName}:title`, surveyName);
  await redisClient.set(`survey:${surveyName}:description`, description);
  await redisClient.set(`survey:${surveyName}:username`, username);
  await redisClient.set(`survey:${surveyName}:last-edit-time`, Date.now());
  await redisClient.set(`survey:${surveyName}:last-summary-time`, Date.now());
}

const respond = async (redisClient, surveyName, username, response) => {
  await redisClient.hSet(`survey:${surveyName}:responses`, username, response);
  await redisClient.set(`survey:${surveyName}:last-edit-time`, Date.now());
  await redisClient.publish('survey-refresh', surveyName);
}
