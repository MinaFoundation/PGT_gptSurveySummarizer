import 'dotenv/config'

import { Client, GatewayIntentBits, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

import { ActionRowBuilder, ModalBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SlashCommandBuilder } from '@discordjs/builders';
import { createClient } from 'redis';
import openai from 'openai';

const summarizeFrequency = process.env.SUMMARIZE_FREQUENCY_SECONDS;

process.on('unhandledRejection', error => {
  console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', error => {
  console.error('Unhandled exception:', error);
});

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

  client.on('interactionCreate', async interaction => {
    const { user } = interaction;

    // TODO check that for discord, usernames are
    // TODO check that for discord, users can't change this.
    //      If they aren't unique, maps should probably use ids to avoid users making multiple comments. 
    const username = user.username; 

    // ------------------------------------------------

    if (interaction.isChatInputCommand()) {
      const { commandName, options } = interaction;

      const subcommand = interaction.options.getSubcommand()

      // ------------------------------------------------
      if (subcommand == 'create') {
        const surveyName = options.getString('survey');
        const modal = new ModalBuilder()
          .setCustomId('createModal-' + surveyName)
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
        if (!(await redisClient.sIsMember('surveys', surveyName))) {
          await interaction.reply({ content: 'There is no survey with that name' });
        } else {

          const surveyDescription = await redisClient.get(`survey:${surveyName}:description`);

          let msg = ``;
          msg += `Survey: ${surveyName}\n`
          msg += `${surveyDescription}`;


          const reply = new ButtonBuilder()
                .setCustomId('respondButton-' + surveyName)
                .setLabel('Respond')
                .setStyle(ButtonStyle.Primary);

          await interaction.reply({ 
            content: `${msg}`,
            components: [new ActionRowBuilder().addComponents(reply)]
          });

          //const modal = new ModalBuilder()
          //  .setCustomId('respondModal-' + surveyName)
          //  .setTitle(`Respond to Survey: suveryName`);// ${surveyName}`);

          //const responseInput = new TextInputBuilder()
          //  .setCustomId('responseInput')
          //  .setLabel(`description here`)//`${surveyDescription}`)
          //  .setStyle(TextInputStyle.Paragraph)
          //  .setRequired(true);

          //const actionRow = new ActionRowBuilder().addComponents(responseInput);
          //modal.addComponents(actionRow);

          //await interaction.showModal(modal);
        }

      // ------------------------------------------------
      } else if (subcommand == 'view') {
        const surveyName = options.getString('survey');

        if (!(await redisClient.sIsMember('surveys', surveyName))) {
          await interaction.reply({ content: 'There is no survey with that name' });
        } else {
          const summaryJSON = await redisClient.get(`survey:${surveyName}:summary`);
          const description = await redisClient.get(`survey:${surveyName}:description`);
          const creator = await redisClient.get(`survey:${surveyName}:username`);
          const responses = await redisClient.hGetAll(`survey:${surveyName}:responses`);
          const summary = JSON.parse(summaryJSON);

          const summarizedResponses = []

          await interaction.reply('Please see the following for the latest survey summary:');

          const channel = client.channels.cache.get(interaction.channelId)

          const totalResponseCount = Object.entries(responses).length;

          const toPercent = (p) => p.toLocaleString(undefined, {style: 'percent', maximumFractionDigits:0}); 

          let msg = `# Survey: ${surveyName}\n`
          msg += `${description}\n`
          msg += `created by ${creator}\n`
          msg += `----------------------\n`
          await channel.send(msg);
          msg = ``;
          for (const topic of summary.taxonomy) {
            msg += `## Topic: ${topic.topicName}\n`
            msg += `${topic.topicShortDescription}\n`
            const topicResponseCount = 
              topic.subtopics
              .map((s) => s.responses == null ? 0 : s.responses.length)
              .reduce((ps, v) => ps + v, 0);

            const topicResponsePercent = toPercent(topicResponseCount / totalResponseCount);
            msg += `Responses: ${topicResponseCount} / ${totalResponseCount} out of the total (${topicResponsePercent})\n`
            for (const subtopic of topic.subtopics) {
              msg += `### Subtopic: ${subtopic.subtopicName}\n`
              msg += `${subtopic.subtopicShortDescription}\n`

              const subtopicResponseCount = subtopic.responses == null ? 0 : subtopic.responses.length;

              const subtopicResponsePercent = toPercent(subtopicResponseCount / topicResponseCount);
              msg += `Responses: ${subtopicResponseCount} / ${topicResponseCount} of this topic (${subtopicResponsePercent})\n`
              const subtopicMessage = await channel.send(msg);
              msg = ``;
              if (subtopic.responses != null && subtopic.responses.length > 0) {
                const thread = await subtopicMessage.startThread({
                  name: `${topic.topicName} / ${subtopic.subtopicName} responses`,
                  autoArchiveDuration: 60,
                  reason: 'Thread for responses'
                });
                for (const response of subtopic.responses) {
                  const latestResponse = responses[response.username];
                  if (latestResponse == response.response) {
                    await thread.send(response.username + ' said "' + response.response + '"');
                  } else {
                    await thread.send(response.username + ' previously said "' + response.response + '". The next update will include their latest response.');
                  }
                  summarizedResponses.push(response);
                }
                await thread.setLocked(true);
              }
            }
          }
          if (summary.unmatchedResponses.length > 0) {
            msg += `------------------\n`;
            msg += `### Unmatched Responses\n`;
            const unmatchedResponseCount = summary.unmatchedResponses.length;
            const unmatchedResponsePercent = toPercent(unmatchedResponseCount / totalResponseCount);
            msg += `Responses: ${unmatchedResponseCount} / ${totalResponseCount} out of the total (${unmatchedResponsePercent})\n`

            const unmatchedMessage = await channel.send(msg);
            msg = ``;
            const thread = await unmatchedMessage.startThread({
              name: `Unmatched responses`,
              autoArchiveDuration: 60,
              reason: 'Thread for responses'
            });
            for (const response of summary.unmatchedResponses) {
              for (const response of subtopic.responses) {
                const latestResponse = responses[response.username];
                if (latestResponse == response.response) {
                  await thread.send(response.username + ' said "' + response.response + '"');
                } else {
                  await thread.send(response.username + ' previously said "' + response.response + '". The next update will include their latest response.');
                }
                summarizedResponses.push(response);
              }
            }
          }

          const unsummarizedResponses = [];

          for (let [username, response] of Object.entries(responses)) {
            const responseIncluded = summarizedResponses.some(
              (sr) => sr.username == username && sr.response == response);
            if (!responseIncluded) {
              unsummarizedResponses.push({ username, response });
            }
          }

          msg += `------------------\n`;

          if (unsummarizedResponses.length > 0) {
            msg += `### Responses Not Yet Categorized\n`
            const unsummarizedResponseCount = unsummarizedResponses.length;
            const unsummarizedResponsePercent = toPercent(unsummarizedResponseCount / totalResponseCount);
            msg += `Responses not included in the current summary: ${unsummarizedResponseCount} / ${totalResponseCount} out of the total (${unsummarizedResponsePercent})\n`
            const secondsTilNextUpdate = Math.ceil((Date.now() % (summarizeFrequency*1000))/1000)
            const minutesTilNextUpdate = Math.ceil(secondsTilNextUpdate/60)
            msg += `${minutesTilNextUpdate} minutes until the next summary update.\n`;
            const unsummarizedMessage = await channel.send(msg);
            msg = ``;
            const thread = await unsummarizedMessage.startThread({
              name: `Responses not yet categorized`,
              autoArchiveDuration: 60,
              reason: 'Thread for responses'
            });
            for (const response of unsummarizedResponses) {
              await thread.send(response.username + ' said "' + response.response + '"');
            }
          } else {
            msg += `All responses have been included in the current survey summary\n`;
          }
          
          if (msg.length > 0) {
            await channel.send(msg);
          }
        }

      // ------------------------------------------------
      } else {
        console.error('unknown subcommand');
      }

    // ------------------------------------------------
    } else if (interaction.isButton()) {
      if (interaction.customId.startsWith('respondButton')) {
        const surveyName = interaction.customId.split('-').slice(1).join('-');

        const modal = new ModalBuilder()
          .setCustomId('respondModal-' + surveyName)
          .setTitle(`Survey Response`);

        const responseInput = new TextInputBuilder()
          .setCustomId('responseInput')
          .setLabel(`Please enter your response below`)
          .setStyle(TextInputStyle.Paragraph)
          .setRequired(true);

        const actionRow = new ActionRowBuilder().addComponents(responseInput);
        modal.addComponents(actionRow);

        await interaction.showModal(modal);
      }
    } else if (interaction.isModalSubmit()) {

      // ------------------------------------------------
      if (interaction.customId.startsWith('createModal')) {
        const surveyName = interaction.customId.split('-').slice(1).join('-');
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
