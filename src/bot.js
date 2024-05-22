import { createSurvey } from "./lib/createSurvey.js";
import { makeSurveyPost } from "./lib/makeSurveyPost.js";
import { startAutoPosting } from "./lib/startAutoPosting.js";
import { command } from "./utils/commandBuilder.js";
import { handleAutoPost } from "./utils/handleAutoPost.js";
import { handleCreate } from "./utils/handleCreate.js";
import { handleCreateModal } from "./utils/handleModals.js";
import { handleInfo } from "./utils/handleInfo.js";
import { handleCreateModal } from "./utils/handleModals.js";
import { handleRespondModal } from "./utils/handleModals.js";
import { handleRespond } from "./utils/handleRespond.js";
import { handleView } from "./utils/handleView.js";

import {
  maxResponsesForMultiResponsePerUser,
  create_multi_cmd,
} from "./constants.js";
import { createClient } from "redis";
import { discordConfig, redisConfig, version } from "./config.js";
import {
  Client,
  GatewayIntentBits,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
} from "discord.js";
import { ActionRowBuilder, ModalBuilder } from "@discordjs/builders";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Unhandled exception:", error);
});

(async () => {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  const redisClient = createClient(redisConfig);
  await redisClient.connect();

  const rest = new REST({ version: "10" }).setToken(discordConfig.token);

  try {
    await rest.put(
      Routes.applicationGuildCommands(
        discordConfig.clientId,
        discordConfig.guildId,
      ),
      { body: [command.toJSON()] },
    );
    console.log("Successfully registered commands.");
  } catch (error) {
    console.error("Error registering commands", error);
  }

  client.once("ready", () => {
    console.log("ready");
    startAutoPosting(client, redisClient);
  });

  client.on("interactionCreate", async (interaction) => {
    const { user } = interaction;

    // TODO check that for discord, usernames are
    // TODO check that for discord, users can't change this.
    //      If they aren't unique, maps should probably use ids to avoid users making multiple comments.
    const username = user.username;

    // ------------------------------------------------

    if (interaction.isChatInputCommand()) {
      const { commandName, options } = interaction;

      const subcommand = interaction.options.getSubcommand();

      // ------------------------------------------------
      if (subcommand == "create" || subcommand == create_multi_cmd) {
        const type = subcommand == create_multi_cmd ? "multi" : "single";
        const surveyName = options.getString("survey");
        const modal = new ModalBuilder()
          .setCustomId("createModal-" + type + "-" + surveyName)
          .setTitle("Create Survey");

        const titleInput = new TextInputBuilder()
          .setCustomId("titleInput")
          .setLabel("What is your survey title?")
          .setStyle(TextInputStyle.Short)
          .setMaxLength(80)
          .setRequired(true);

        const descriptionInput = new TextInputBuilder()
          .setCustomId("descriptionInput")
          .setLabel("Write a short description for your survey")
          .setStyle(TextInputStyle.Paragraph);

        const firstActionRow = new ActionRowBuilder().addComponents(titleInput);
        const secondActionRow = new ActionRowBuilder().addComponents(
          descriptionInput,
        );
        modal.addComponents(firstActionRow, secondActionRow);

        await interaction.showModal(modal);

        // ------------------------------------------------
      } else if (subcommand == "respond") {
        const surveyName = options.getString("survey");
        if (!(await redisClient.sIsMember("surveys", surveyName))) {
          await interaction.reply({
            content: "There is no survey with that name",
            ephemeral: true,
          });
        } else {
          const surveyDescription = await redisClient.get(
            `survey:${surveyName}:description`,
          );

          let msg = ``;
          msg += `### Survey: ${surveyName}\n`;
          msg += `> ${surveyDescription}`;

          const reply = new ButtonBuilder()
            .setCustomId("respondButton-" + surveyName)
            .setLabel("Respond")
            .setStyle(ButtonStyle.Primary);

          await interaction.reply({
            content: `${msg}`,
            components: [new ActionRowBuilder().addComponents(reply)],
          });
        }

        // ------------------------------------------------
      } else if (subcommand == "view") {
        const surveyName = options.getString("survey");

        const messagesToSend = await makeSurveyPost(redisClient, surveyName);
        for (const [i, toSend] of Object.entries(messagesToSend)) {
          if (i == 0) {
            await interaction.reply(toSend);
          } else {
            await interaction.followUp(toSend);
          }
        }
        // ------------------------------------------------
      } else if (subcommand == "start-auto-post") {
        const channel = client.channels.cache.get(interaction.channelId);
        const surveyName = options.getString("survey");
        redisClient.sAdd("auto-post-surveys", channel + ":" + surveyName);
        await interaction.reply({
          content: "Your survey will start being auto-posted",
          ephemeral: true,
        });
      } else if (subcommand == "stop-auto-post") {
        const channel = client.channels.cache.get(interaction.channelId);
        const surveyName = options.getString("survey");
        redisClient.sRem("auto-post-surveys", channel + ":" + surveyName);
        await interaction.reply({
          content: "Your survey will stop being auto-posted",
          ephemeral: true,
        });
      } else if (subcommand == "info") {
        const github = "https://github.com/MinaFoundation/gptSurveySummarizer";
        await interaction.reply({
          content: `version number ${version}\n\nLearn more about the project on our [github](${github}).`,
          ephemeral: true,
        });
      } else {
        console.error("unknown subcommand");
      }

      // ------------------------------------------------
    } else if (interaction.isButton()) {
      if (interaction.customId.startsWith("respondButton")) {
        const surveyName = interaction.customId.split("-").slice(1).join("-");
        const surveyType = await redisClient.get(`survey:${surveyName}:type`);

        const hadResponse = await redisClient.hExists(
          `survey:${surveyName}:responses`,
          username,
        );

        const plural = surveyType == "single" ? "" : "s";

        const modal = new ModalBuilder()
          .setCustomId("respondModal-" + surveyName)
          .setTitle(`Survey Response${plural}`);

        let label;
        if (hadResponse) {
          label = `Please update your response${plural} below`;
        } else {
          label = `Please enter your response${plural} below`;
        }

        if (surveyType == "single") {
          let defaultText = "";
          if (hadResponse) {
            defaultText = await redisClient.hGet(
              `survey:${surveyName}:responses`,
              username,
            );
          }

          const responseInput = new TextInputBuilder()
            .setCustomId("responseInput")
            .setLabel(label)
            .setStyle(TextInputStyle.Paragraph)
            .setValue(defaultText)
            .setRequired(true);

          const actionRow = new ActionRowBuilder().addComponents(responseInput);
          modal.addComponents(actionRow);
        } else {
          let priorResponses = new Array(maxResponsesForMultiResponsePerUser)
            .fill(null)
            .map(() => "");
          if (hadResponse) {
            const priorResponseData = await redisClient.hGet(
              `survey:${surveyName}:responses`,
              username,
            );
            try {
              priorResponses = JSON.parse(priorResponseData);
            } catch (e) {
              console.error("error processing multi-response", e);
              priorResponses = [priorResponseData];
            }
          }
          const components = new Array(maxResponsesForMultiResponsePerUser)
            .fill(null)
            .map((_, i) => {
              let label_i;
              if (i == 0) {
                label_i = label + `:`;
              } else {
                label_i = `Response ${i + 1}:`;
              }
              const responseInput = new TextInputBuilder()
                .setCustomId("responseInput-" + i)
                .setLabel(label_i)
                .setStyle(TextInputStyle.Paragraph)
                .setValue(priorResponses[i])
                .setRequired(i == 0);
              const actionRow = new ActionRowBuilder().addComponents(
                responseInput,
              );

              return actionRow;
            });
          modal.addComponents(components);
        }

        await interaction.showModal(modal);
      }
    } else if (interaction.isModalSubmit()) {
      // ------------------------------------------------
      if (interaction.customId.startsWith("createModal")) {
        const surveyType = interaction.customId
          .split("-")
          .slice(1, 2)
          .join("-");
        const surveyName = interaction.customId.split("-").slice(2).join("-");
        const title = interaction.fields.getTextInputValue("titleInput");
        const description =
          interaction.fields.getTextInputValue("descriptionInput");
        if (await redisClient.sIsMember("surveys", surveyName)) {
          await interaction.reply({
            content: "A survey with that name already exists",
            ephemeral: true,
          });
        } else {
          await createSurvey(
            redisClient,
            title,
            surveyType,
            description,
            username,
          );
          await interaction.reply({
            content: "Your Survey was created successfully!",
            ephemeral: true,
          });
        }

        // ------------------------------------------------
      } else if (interaction.customId.startsWith("respondModal")) {
        const surveyName = interaction.customId.split("-").slice(1).join("-");
        const surveyType = await redisClient.get(`survey:${surveyName}:type`);
        const plural = surveyType == "single" ? "" : "s";
        let response;
        if (surveyType == "single") {
          response = interaction.fields.getTextInputValue("responseInput");
        } else {
          const responses = new Array(maxResponsesForMultiResponsePerUser)
            .fill(null)
            .map((_, i) => {
              return interaction.fields.getTextInputValue("responseInput-" + i);
            });
          response = JSON.stringify(responses);
        }
        const hadResponse = await redisClient.hExists(
          `survey:${surveyName}:responses`,
          username,
        );
        await respond(redisClient, surveyName, username, response);
        if (hadResponse) {
          await interaction.reply({
            content: "Your Response was updated successfully!",
            ephemeral: true,
          });
        } else {
          await interaction.reply({
            content: "Your Response was added successfully!",
            ephemeral: true,
          });
        }
      }
      // ------------------------------------------------
    } else if (interaction.isAutocomplete()) {
      const surveys = await redisClient.sMembers("surveys");

      const focusedValue = interaction.options.getFocused();
      const choices = surveys;
      const filtered = choices.filter((choice) =>
        choice.startsWith(focusedValue),
      );

      await interaction.respond(
        filtered.map((choice) => ({ name: choice, value: choice })),
      );
    }
  });

  client.login(discordConfig.token);
})();
