import 'dotenv/config'

import { Client, GatewayIntentBits, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle, AttachmentBuilder } from 'discord.js';
import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

import { ActionRowBuilder, ModalBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, SlashCommandBuilder } from '@discordjs/builders';
import { createClient } from 'redis';
import openai from 'openai';

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

  client.once('ready', () => console.log('ready'));

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
      if (subcommand == 'create' || subcommand == create_multi_cmd) {
        const type = subcommand == create_multi_cmd ? 'multi' : 'single';
        const surveyName = options.getString('survey');
        const modal = new ModalBuilder()
          .setCustomId('createModal-' + type + '-' + surveyName)
          .setTitle('Create Survey');

        const titleInput = new TextInputBuilder()
          .setCustomId('titleInput')
          .setLabel("What is your survey title?")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(80)
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
          await interaction.reply({ content: 'There is no survey with that name', ephemeral: true });
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
          await interaction.reply({ content: 'There is no survey with that name', ephemeral: true });
        } else {
          const summaryJSON = await redisClient.get(`survey:${surveyName}:summary`);
          const description = await redisClient.get(`survey:${surveyName}:description`);
          const surveyType = await redisClient.get(`survey:${surveyName}:type`);
          const creator = await redisClient.get(`survey:${surveyName}:username`);
          const responses = await redisClient.hGetAll(`survey:${surveyName}:responses`);
          const summary = JSON.parse(summaryJSON);

          const summarizedResponses = []

          //await interaction.reply('Please see the following for the latest survey summary:');

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

          const number_to_letter = {
            0: 'A',
            1: 'B',
            2: 'C',
            3: 'D',
            4: 'E',
            5: 'F',
            6: 'G',
            7: 'H',
            8: 'I',
            9: 'J',
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

              msg += `## ${number_to_discord_number[index+1]} `
              msg += `${topic.topicName} [${topicResponseCount} response${pluralize(topicResponseCount)}]\n`
              msg += `${topic.topicShortDescription}\n`
              msg += `\n`

              for (const [subindex, subtopic] of topic.subtopics.entries()) {
                const subtopicResponseCount = subtopic.responses == null ? 0 : subtopic.responses.length;

                msg += `> ${number_to_discord_letter[subindex]} `
                msg += `**${subtopic.subtopicName} [${subtopicResponseCount} response${pluralize(subtopicResponseCount)}]**\n`

                msg += `> ${subtopic.subtopicShortDescription}\n\n`

                if (subtopic.responses != null && subtopic.responses.length > 0) {

                  const responseMessages = subtopic.responses.map((response) => {
                    summarizedResponses.push(response);
                    return formatResponse(surveyType, response, responses);
                  });

                  const title = `${index+1}${number_to_letter[subindex]} ${topic.topicName} → ${subtopic.subtopicName}`;

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
              return formatResponse(surveyType, response, responses);
            });

            const title = 'Unmatched responses';

            threads.push({
              title,
              responseMessages
            });
          }

          const unsummarizedResponses = [];

          if (surveyType == 'single') {
            for (let [username, response] of Object.entries(responses)) {
              const responseIncluded = summarizedResponses.some(
                (sr) => sr.username == username && sr.response == response);
              if (!responseIncluded) {
                unsummarizedResponses.push({ username, response });
              }
            }
          } else {
            for (let [username, response] of Object.entries(responses)) {
              let userResponses = JSON.parse(response);
              userResponses = userResponses.filter((r) => r != '');
              userResponses.forEach((response) => {
                const responseIncluded = summarizedResponses.some(
                  (sr) => sr.username.split('[')[0] == username && sr.response == response);
                if (!responseIncluded) {
                  unsummarizedResponses.push({ username, response });
                }
              });
            };
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

            const title = 'New responses not yet categorized';

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

          const content = '';
          const files = [];
          if (threads.length > 0) {
            let content = '';

            for (const thread of threads) {
              const {
                    title,
                    responseMessages
              } = thread;

              content += title + '\n';
              for (const response of responseMessages) {
                content += '    ' + response + '\n';
              }
              content += '\n';
            }
            files.push(new AttachmentBuilder(Buffer.from(content)).setName('responses.txt'));
          }

          await interaction.reply({ content: msg, files });
        }

      // ------------------------------------------------
      } else if (subcommand == 'info') {
        const github = 'https://github.com/MinaFoundation/gptSurveySummarizer';
        await interaction.reply({ content: `version number ${version}\n\nLearn more about the project on our [github](${github}).`, ephemeral: true });
      } else {
        console.error('unknown subcommand');
      }

    // ------------------------------------------------
    } else if (interaction.isButton()) {
      if (interaction.customId.startsWith('respondButton')) {
        const surveyName = interaction.customId.split('-').slice(1).join('-');
        const surveyType = await redisClient.get(`survey:${surveyName}:type`);

        const hadResponse = await redisClient.hExists(`survey:${surveyName}:responses`, username)

        const plural = surveyType == 'single' ? '' : 's';

        const modal = new ModalBuilder()
          .setCustomId('respondModal-' + surveyName)
          .setTitle(`Survey Response${plural}`);

        let label;
        if (hadResponse) {
          label = `Please update your response${plural} below`;
        } else {
          label = `Please enter your response${plural} below`;
        }

        if (surveyType == 'single') {
          let defaultText = '';
          if (hadResponse) {
            defaultText = await redisClient.hGet(`survey:${surveyName}:responses`, username)
          }

          const responseInput = new TextInputBuilder()
            .setCustomId('responseInput')
            .setLabel(label)
            .setStyle(TextInputStyle.Paragraph)
            .setValue(defaultText)
            .setRequired(true);

          const actionRow = new ActionRowBuilder().addComponents(responseInput);
          modal.addComponents(actionRow);
        } else {
          let priorResponses = new Array(maxResponsesForMultiResponsePerUser).fill(null).map(() => '');
          if (hadResponse) {
            const priorResponseData = await redisClient.hGet(`survey:${surveyName}:responses`, username)
            priorResponses = JSON.parse(priorResponseData);
          }
          const components = new Array(maxResponsesForMultiResponsePerUser).fill(null).map((_, i) => {
            let label_i;
            if (i == 0) {
              label_i = label + `:`;
            } else {
              label_i = `Response ${i+1}:`;
            }
            const responseInput = new TextInputBuilder()
              .setCustomId('responseInput-' + i)
              .setLabel(label_i)
              .setStyle(TextInputStyle.Paragraph)
              .setValue(priorResponses[i])
              .setRequired(i == 0);
            const actionRow = new ActionRowBuilder().addComponents(responseInput);

            return actionRow

          });
          modal.addComponents(components);
        }

        await interaction.showModal(modal);
      }
    } else if (interaction.isModalSubmit()) {

      // ------------------------------------------------
      if (interaction.customId.startsWith('createModal')) {
        const surveyType = interaction.customId.split('-').slice(1,2).join('-');
        const surveyName = interaction.customId.split('-').slice(2).join('-');
        const title = interaction.fields.getTextInputValue('titleInput');
        const description = interaction.fields.getTextInputValue('descriptionInput');
        if (await redisClient.sIsMember('surveys', surveyName)) {
          await interaction.reply({ content: 'A survey with that name already exists', ephemeral: true });
        } else {
          await createSurvey(
            redisClient, 
            title, 
            surveyType,
            description,
            username
          );
          await interaction.reply({ content: 'Your Survey was created successfully!', ephemeral: true });
        }

      // ------------------------------------------------
      } else if (interaction.customId.startsWith('respondModal')) {
        const surveyName = interaction.customId.split('-').slice(1).join('-');
        const surveyType = await redisClient.get(`survey:${surveyName}:type`);
        const plural = surveyType == 'single' ? '' : 's';
        let response;
        if (surveyType == 'single') {
          response = interaction.fields.getTextInputValue('responseInput');
        } else {
          const responses = new Array(maxResponsesForMultiResponsePerUser).fill(null).map((_, i) => {
            return interaction.fields.getTextInputValue('responseInput-' + i);
          });
          response = JSON.stringify(responses);
        }
        const hadResponse = await redisClient.hExists(`survey:${surveyName}:responses`, username)
        await respond(redisClient, surveyName, username, response)
        if (hadResponse) {
          await interaction.reply({ content: 'Your Response was updated successfully!', ephemeral: true });
        } else {
          await interaction.reply({ content: 'Your Response was added successfully!', ephemeral: true });
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

  //await redisClient.flushAll();
  //await runTest(redisClient);
})();

function formatResponse(surveyType, response, responses) {
  let responseIsLatest;
  if (surveyType == 'single') {
    const latestResponse = responses[response.username];
    responseIsLatest = latestResponse == response.response;
  } else {
    const baseUsername = response.username.split('[')[0];
    let userResponses = JSON.parse(responses[baseUsername]);
    responseIsLatest = userResponses.some((r) => r == response.response);
  }
  if (responseIsLatest) {
    return response.username + ' said "' + response.response + '"';
  } else {
    return response.username + ' previously said "' + response.response + '". The next update will include their latest response.';
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
