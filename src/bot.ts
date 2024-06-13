import log from "./logger";

import { setIntervalAsync } from "set-interval-async/dynamic";
import { startAutoPosting } from "./lib/startAutoPosting.js";
import {
  command,
  handleAutoPost,
  handleCreate,
  handleInfo,
  handleEdit,
  handleCreateModal,
  handleDeleteModal,
  handleDelete,
  handleDeleteButton,
  handleRespondModal,
  handleRespond,
  handleRespondButton,
  handleView,
  handleEditModal,
  handleSetStatus,
} from "@commands/index";

import {
  maxResponsesForMultiResponsePerUser,
  create_multi_cmd,
  EXPIRE_STATUS_LOOP_MINUTE,
} from "@constants";

import { discordConfig, redisConfig, version } from "@config";
import { createClient } from "redis";
import { Client, GatewayIntentBits } from "discord.js";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { threadPost } from "@lib/threadPost.js";

process.on("unhandledRejection", (error) => {
  log.error("Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
  log.error("Unhandled exception:", error);
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
    log.info("Successfully registered commands.");
  } catch (error) {
    log.error("Error registering commands", error);
  }

  client.once("ready", () => {
    log.info("Ready as ", client.user.username);
    startAutoPosting(client, redisClient);
    startSurveyStatusChecker(redisClient);
  });

  client.on("interactionCreate", async (interaction) => {
    const { user } = interaction;

    // TODO check that for discord, usernames are
    // TODO check that for discord, users can't change this.
    //      If they aren't unique, maps should probably use ids to avoid users making multiple comments.
    const username = user.username;

    if (interaction.isChatInputCommand()) {
      const { commandName, options } = interaction;
      const surveyName = options.getString("survey");
      const subcommand = interaction.options.getSubcommand();

      switch (subcommand) {
        case "create":
        case create_multi_cmd:
          await handleCreate(interaction, subcommand, create_multi_cmd);
          break;
        case "delete":
          await handleDelete(redisClient, interaction, surveyName);
          break;
        case "respond":
          await handleRespond(redisClient, interaction, surveyName);
          break;
        case "edit":
          await handleEdit(interaction, redisClient, surveyName);
          break;
        case "view":
          await handleView(interaction, surveyName, redisClient);
          break;
        case "set-status":
          const status = options.getString("status");
          await handleSetStatus(interaction, surveyName, status, redisClient);
          break;
        case "start-auto-post":
          await handleAutoPost(interaction, "start", client, redisClient);
          break;
        case "stop-auto-post":
          await handleAutoPost(interaction, "stop", client, redisClient);
          break;
        case "info":
          await handleInfo(interaction, version);
          break;
        default:
          log.error("unknown subcommand");
      }
    } else if (interaction.isButton()) {
      if (interaction.customId.startsWith("respondButton")) {
        const surveyName = interaction.customId.split("-").slice(1).join("-");
        await handleRespondButton(
          interaction,
          surveyName,
          redisClient,
          username,
          maxResponsesForMultiResponsePerUser,
        );
      } else if (interaction.customId.startsWith("deleteButton")) {
        const surveyName = interaction.customId.split("-").slice(1).join("-");
        await handleDeleteButton(interaction, surveyName);
      }
    } else if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith("createModal")) {
        const [sn, desc, fields, isPosted] = await handleCreateModal(
          interaction,
          username,
          redisClient,
        );
        log.debug(sn);
        if (isPosted) {
          await threadPost(client, redisClient, sn, desc, fields);
        }
      } else if (interaction.customId.startsWith("respondModal")) {
        await handleRespondModal(interaction, username, redisClient);
      } else if (interaction.customId.startsWith("deleteModal")) {
        await handleDeleteModal(interaction, username, redisClient);
      } else if (interaction.customId.startsWith("editModal")) {
        await handleEditModal(interaction, username, redisClient);
      }
    } else if (interaction.isAutocomplete()) {
      const surveys = await redisClient.sMembers("surveys");
      const focusedValue = interaction.options.getFocused();
      const commandName = interaction.options.getSubcommand();
      const filtered = [];

      if (commandName === "respond") {
        const activeKeys = surveys.map(
          (survey) => `survey:${survey}:is-active`,
        );
        const activeStatuses = await redisClient.mGet(activeKeys);

        surveys.forEach((survey, index) => {
          if (
            activeStatuses[index] === "true" &&
            survey.startsWith(focusedValue)
          ) {
            filtered.push(survey);
          }
        });
      } else {
        surveys.forEach((survey) => {
          if (survey.startsWith(focusedValue)) {
            filtered.push(survey);
          }
        });
      }

      const start = Math.max(filtered.length - 25, 0);
      const limitedChoices = filtered.slice(start);

      await interaction.respond(
        limitedChoices.map((choice) => ({ name: choice, value: choice })),
      );
    }
  });

  const startSurveyStatusChecker = (redisClient) => {
    setIntervalAsync(
      async () => {
        await checkAndUpdateSurveyStatus(redisClient);
      },
      60 * 1000 * EXPIRE_STATUS_LOOP_MINUTE,
    ); // 60 * 1000 ms = 1 minute
  };

  client.login(discordConfig.token);
})();

const checkAndUpdateSurveyStatus = async (redisClient: any) => {
  try {
    const surveys = await redisClient.sMembers("surveys");
    const currentTime = Date.now();

    const multi = redisClient.multi();

    for (const survey of surveys) {
      multi.get(`survey:${survey}:endtime`);
      multi.get(`survey:${survey}:is-active`);
    }

    const results = await multi.exec();

    const updateMulti = redisClient.multi();

    for (let i = 0; i < surveys.length; i++) {
      const endTime = results[i * 2]; // Results of the endtime
      const isActive = results[i * 2 + 1]; // Results of the is-active

      if (endTime && isActive === "true" && currentTime >= parseInt(endTime)) {
        updateMulti.set(`survey:${surveys[i]}:is-active`, "false");
        log.info(`Survey ${surveys[i]} is now inactive.`);
      }
    }

    await updateMulti.exec();
  } catch (error) {
    log.error("Error checking and updating survey status:", error);
  }
};
