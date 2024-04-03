import 'dotenv/config'

import { Client, GatewayIntentBits, TextInputBuilder, TextInputStyle } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

import { ActionRowBuilder, ModalBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SlashCommandBuilder } from '@discordjs/builders';
import { createClient } from 'redis';
import openai from 'openai';

(async() => {

  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  const redisClient = createClient({ url: process.env.REDIS_URL });
  await redisClient.connect();

  const command = 
    new SlashCommandBuilder()
    .setName('gptsurvey')
    .setDescription('create, respond to, and view gpt-powered natural language surveys')
    .addSubcommand(sc => 
      sc
        .setName('create')
        .setDescription('create a new survey')
    )
    .addSubcommand(sc => 
      sc
        .setName('respond')
        .setDescription('respond to a survey')
        .addStringOption(option =>
          option.setName('survey')
            .setDescription('survey name')
            .setAutocomplete(true)
            .setRequired(true))
    )
    .addSubcommand(sc => 
      sc
        .setName('view')
        .setDescription('view the summary and responses for a survey')
        .addStringOption(option =>
          option.setName('survey')
            .setDescription('survey name')
            .setAutocomplete(true)
            .setRequired(true))
    )

  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

  try {
      await rest.put(
          Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
          { body: [ command.toJSON() ] },
      );

      console.log('Successfully registered commands.');
  } catch (error) {
      console.error(error);
  }

  client.on('interactionCreate', async interaction => {
    const { user } = interaction;

    // TODO check that these are unique
    // TODO check that users can't change this, if so consider using ids in maps
    const username = user.username; 

    // ------------------------------------------------

    if (interaction.isChatInputCommand()) {
      const { commandName, options } = interaction;

      const subcommand = interaction.options.getSubcommand()

      // ------------------------------------------------
      if (subcommand == 'create') {
        const modal = new ModalBuilder()
          .setCustomId('createModal')
          .setTitle('Create Survey');

        const titleInput = new TextInputBuilder()
          .setCustomId('titleInput')
          .setLabel("What is your survey title?")
          .setStyle(TextInputStyle.Short)
          .setRequired(true);

        const descriptionInput = new TextInputBuilder()
          .setCustomId('descriptionInput')
          .setLabel("Write a short description for your survey")
          .setStyle(TextInputStyle.Paragraph);

        const firstActionRow = new ActionRowBuilder().addComponents(titleInput);
        const secondActionRow = new ActionRowBuilder().addComponents(descriptionInput);
        modal.addComponents(firstActionRow, secondActionRow);

        await interaction.showModal(modal);

      // ------------------------------------------------
      } else if (subcommand == 'respond') {
        const surveyName = options.getString('survey');

        const surveyDescription = await redisClient.get(`survey:${surveyName}:description`);

        const modal = new ModalBuilder()
          .setCustomId('respondModal-' + surveyName)
          .setTitle('Respond to Survey');

        const responseInput = new TextInputBuilder()
          .setCustomId('responseInput')
          .setLabel(`${surveyName} | ${surveyDescription}`)
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        const actionRow = new ActionRowBuilder().addComponents(responseInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);

      // ------------------------------------------------
      } else if (subcommand == 'view') {
        const surveyName = options.getString('survey');
        const summaryJSON = await redisClient.get(`survey:${surveyName}:summary`);
        const description = await redisClient.get(`survey:${surveyName}:description`);
        const creator = await redisClient.get(`survey:${surveyName}:username`);
        const responses = await redisClient.hGetAll(`survey:${surveyName}:responses`);
        const summary = JSON.parse(summaryJSON);

        const summarizedResponses = []

        await interaction.reply('Please see the following latest survey summary:');

        const channel = client.channels.cache.get(interaction.channelId)

        let msg = `# ${surveyName}\n`
        msg += `${description}\n`
        msg += `created by ${creator}\n`
        msg += `----------------------\n`
        await channel.send(msg);
        msg = ``;
        for (const topic of summary.taxonomy) {
          msg += `## ${topic.topicName}\n`
          msg += `${topic.topicShortDescription}\n`
          // TODO post # of responses and % out of total responses
          for (const subtopic of topic.subtopics) {
            msg += `## ${subtopic.subtopicName}\n`
            msg += `${subtopic.subtopicShortDescription}\n`
            // TODO post # of responses and % out of topic
            const subtopicMessage = await channel.send(msg);
            msg = ``;
            if (subtopic.responses.length > 0) {
              const thread = await subtopicMessage.startThread({
                name: `${subtopic.subtopicName} responses`,
                autoArchiveDuration: 60,
                reason: 'Thread for responses'
              });
              for (const response of subtopic.responses) {
                await thread.send(response.username + ' said "' + response.response + '"');
                summarizedResponses.push(response);
              }
              await thread.setLocked(true);
            }
          }
        }
        if (summary.unmatchedResponses.length > 0) {
          msg += `## Unmatched Responses\n`
          const unmatchedMessage = await channel.send(msg);
          msg = ``;
          const thread = await unmatchedMessage.startThread({
            name: `Unmatched responses`,
            autoArchiveDuration: 60,
            reason: 'Thread for responses'
          });
          for (const response of summary.unmatchedResponses) {
            for (const response of subtopic.responses) {
              await thread.send(response.username + ' said "' + response.response + '"');
              summarizedResponses.push(response);
            }
          }
        }

        const unsummarizedResponses = []; // TODO
        if (unsummarizedResponses.length > 0) {
          msg += `## Responses Not Yet Categorized\n`
          // TODO post when update will happen
          const unsummarizedMessage = await channel.send(msg);
          msg = ``;
          const thread = await unsummarizedMessage.startThread({
            name: `Unsummarized responses`,
            autoArchiveDuration: 60,
            reason: 'Thread for responses'
          });
          for (const response of unsummarizedResponses) {
            await thread.send(response.username + ' said "' + response.response + '"');
          }
        }
        
        if (msg.length > 0) {
          await channel.send(msg);
        }

      // ------------------------------------------------
      } else {
        console.error('unknown subcommand');
      }

    // ------------------------------------------------
    } else if (interaction.isModalSubmit()) {

      // ------------------------------------------------
    	if (interaction.customId === 'createModal') {
        const title = interaction.fields.getTextInputValue('titleInput');
        const description = interaction.fields.getTextInputValue('descriptionInput');
        if (await redisClient.sIsMember('surveys', surveyName)) {
          await interaction.reply({ content: 'A survey with that name already exists' });
        } else {
          createSurvey(
            redisClient, 
            title, 
            description,
            username
          );
          await interaction.reply({ content: 'Your Survey was created successfully!' });
        }

      // ------------------------------------------------
      } else if (interaction.customId.startsWith('respondModal')) {
        const surveyName = interaction.customId.split('-').slice(1).join('-');
        const response = interaction.fields.getTextInputValue('responseInput')
        const hadResponse = await redisClient.hExists(`survey:${surveyName}:responses`, username)
        await respond(redisClient, surveyName, username, response)
        if (hadResponse) {
          await interaction.reply({ content: 'Your Response was updated successfully!' });
        } else {
          await interaction.reply({ content: 'Your Response was added successfully!' });
        }
      }
    // ------------------------------------------------
    } else if (interaction.isAutocomplete()) {
      const surveys = await redisClient.sMembers('surveys');

      const focusedValue = interaction.options.getFocused();
      const choices = surveys;
      const filtered = choices.filter(choice => choice.startsWith(focusedValue));

      await interaction.respond(
        filtered.map(choice => ({ name: choice, value: choice })),
      );
    }
  });

  client.login(process.env.DISCORD_TOKEN);

  //await runTest(redisClient);
})();

const runTest = async (redisClient) => {
  await redisClient.flushAll();
  await createSurvey(redisClient, 'test-survey', 'test-description', 'evan');
  await respond(redisClient, 'test-survey', 'evan', 'comment1');
  await respond(redisClient, 'test-survey', 'bob', 'comment2');
}

const createSurvey = async (redisClient, surveyName, description, username) => {
  await redisClient.sAdd('surveys', surveyName);
  const initialSummaryJSON = JSON.stringify({});
  await redisClient.set(`survey:${surveyName}:summary`, initialSummaryJSON);
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
