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
          msg += `### Survey: ${surveyName}\n`
          msg += `> ${surveyDescription}`;


          const reply = new ButtonBuilder()
                .setCustomId('respondButton-' + surveyName)
                .setLabel('Respond')
                .setStyle(ButtonStyle.Primary);

          await interaction.reply({ 
            content: `${msg}`,
            components: [new ActionRowBuilder().addComponents(reply)]
          });
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

          const pluralize = (n) => n == 1 ? '' : 's';

          const divider = `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n`

          const number_to_discord_number = {
            0: ':zero:',
            1: ':one:',
            2: ':two:',
            3: ':three:',
            4: ':four:',
            5: ':five:',
            6: ':six:',
            7: ':seven:',
            8: ':eight:',
            9: ':nine:',
          }

          const number_to_discord_letter = {
            0: ':regional_indicator_a:',
            1: ':regional_indicator_b:',
            2: ':regional_indicator_c:',
            3: ':regional_indicator_d:',
            4: ':regional_indicator_e:',
            5: ':regional_indicator_f:',
            6: ':regional_indicator_g:',
            7: ':regional_indicator_h:',
            8: ':regional_indicator_i:',
            9: ':regional_indicator_j:',
          }

          let msg = '';
          msg += `# :ballot_box: ${surveyName}\n`;
          msg += divider;
          msg += `:page_facing_up: ${description}\n`;
          msg += `:thought_balloon: created by ${creator}\n`;
          msg += `:speech_balloon: ${totalResponseCount} responses\n`;
          if (summary.taxonomy != null && Object.keys(summary.taxonomy).length > 0) {
            msg += divider;
          }

          const threads = [];

          if (summary.taxonomy != null) {
            for (const [index, topic] of summary.taxonomy.entries()) {
              const topicResponseCount = 
                topic.subtopics
                .map((s) => s.responses == null ? 0 : s.responses.length)
                .reduce((ps, v) => ps + v, 0);

              msg += `## ${number_to_discord_number[index+1]}`
              msg += `${topic.topicName} [${topicResponseCount} response${pluralize(topicResponseCount)}]\n`
              msg += `${topic.topicShortDescription}\n`
              msg += `\n`

              for (const [subindex, subtopic] of topic.subtopics.entries()) {
                const subtopicResponseCount = subtopic.responses == null ? 0 : subtopic.responses.length;

                msg += `> ${number_to_discord_letter[subindex]}`
                msg += `**${subtopic.subtopicName} [${subtopicResponseCount} response${pluralize(subtopicResponseCount)}]**\n`

                msg += `> ${subtopic.subtopicShortDescription}\n\n`

                if (subtopic.responses != null && subtopic.responses.length > 0) {

                  const responseMessages = subtopic.responses.map((response) => {
                    summarizedResponses.push(response);
                    const latestResponse = responses[response.username];
                    if (latestResponse == response.response) {
                      return response.username + ' said "' + response.response + '"';
                    } else {
                      return response.username + ' previously said "' + response.response + '". The next update will include their latest response.';
                    }
                  });

                  const title = `${number_to_discord_number[index+1]} ${number_to_discord_letter[subindex]} ${topic.topicName} → ${subtopic.subtopicName}`;

                  threads.push({
                    title,
                    responseMessages
                  });
                }
              }
            }
          }
          if (summary.unmatchedResponses != null && summary.unmatchedResponses.length > 0) {
            msg += divider;
            msg += `### Unmatched Responses\n`;
            msg += `:speech_balloon: Responses not matched with any topic: ${unmatchedResponseCount}\n`

            const responseMessages = summary.unmatchedResponses.map((response) => {
              summarizedResponses.push(response);
              const latestResponse = responses[response.username];
              if (latestResponse == response.response) {
                return response.username + ' said "' + response.response + '"';
              } else {
                return response.username + ' previously said "' + response.response + '". The next update will include their latest response.';
              }
            });

            const title = ':speech_balloon: Unmatched responses';

            threads.push({
              title,
              responseMessages
            });
          }

          const unsummarizedResponses = [];

          for (let [username, response] of Object.entries(responses)) {
            const responseIncluded = summarizedResponses.some(
              (sr) => sr.username == username && sr.response == response);
            if (!responseIncluded) {
              unsummarizedResponses.push({ username, response });
            }
          }

          msg += divider;

          if (unsummarizedResponses.length > 0) {
            msg += `## :new: Responses Not Yet Categorized\n`
            const unsummarizedResponseCount = unsummarizedResponses.length;
            msg += `:speech_balloon: Responses not included in the current summary: ${unsummarizedResponseCount}\n`
            const timeSinceLastUpdate = (Date.now() % (summarizeFrequency*1000))
            const timeOfLastUpdate = Date.now() - timeSinceLastUpdate;
            const timeOfNextUpdate = timeOfLastUpdate + summarizeFrequency*1000;
            const secondsTilNextUpdate = (timeOfNextUpdate - Date.now())/1000
            const minutesTilNextUpdate = Math.ceil(secondsTilNextUpdate/60)
            msg += `:timer: ${minutesTilNextUpdate} minutes until the next summary update.\n`;

            const responseMessages = unsummarizedResponses.map((response) => {
              return response.username + ' said "' + response.response + '"';
            });

            const title = ':new: Responses not yet categorized';

            threads.push({
              title,
              responseMessages
            });
          } else {
            msg += `:green_circle: All responses have been included in the current survey summary\n`;
          }
          if (threads.length > 0) {
            msg += divider;
          }
          
          if (msg.length > 0) {
            await channel.send(msg);
          }

          if (threads.length > 0) {
            for (const thread of threads) {
              const {
                    title,
                    responseMessages
              } = thread;

              const message = await channel.send(title);
              const discordThread = await message.startThread({
                name: 'Responses',
                autoArchiveDuration: 60,
                reason: 'Thread for responses'
              });
              for (const response of responseMessages) {
                await discordThread.send(response);
              }
              await discordThread.setLocked(true);
            }
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
