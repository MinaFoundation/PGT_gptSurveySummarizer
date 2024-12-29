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
  handleSummary,
  handleEditSurveyCount,
  handleEditSurveyCountModal,
  handleLeaderboard,
  handleViewSurveyCounts,
  handleViewDiscordSurveyCounts,
  adminActionRow,
  adminEmbed,
  publicResultsDropdown,
  createSurveyActionRow,
  surveyManagementActionRow,
  viewResultsActionRow1,
  viewResultsActionRow2,
  surveyLeaderboardActionRow,
} from "@commands/index";

import {
  maxResponsesForMultiResponsePerUser,
  create_multi_cmd,
  EXPIRE_STATUS_LOOP_MINUTE,
} from "@constants";

import { discordConfig, redisConfig, version } from "@config";
import { createClient } from "redis";
import { Client, GatewayIntentBits, PermissionsBitField } from "discord.js";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { threadPost } from "@lib/threadPost.js";
import { updateThreadPost } from "@lib/updateThreadPost";
import { deleteThreadPost } from "./lib";

process.on("unhandledRejection", (error) => {
  log.error("Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
  log.error("Unhandled exception:", error);
});

(async () => {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  const redisClient = createClient(redisConfig);

  redisClient.on("error", (err) => log.error("Redis Client Error", err));

  await redisClient.connect();
  redisClient.on("connect", () => log.info("Connected to Redis server"));

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

  client.once("ready", async () => {
    log.info("Ready as ", client.user.username);
    startAutoPosting(client, redisClient);
    startSurveyStatusChecker(redisClient);

    const adminChannelId = discordConfig.adminChannelId;
    let adminChannel;

    try {
      adminChannel = await client.channels.fetch(adminChannelId);
    } catch (err) {
      log.error("Error fetching admin channel:", err);
    }

    if (!adminChannel) {
      log.error(
        "Admin channel not found. Please ensure the adminChannelId is correct.",
      );
      return;
    }

    await adminChannel.send({
      embeds: [adminEmbed],
      components: [adminActionRow],
    });

    log.info("Admin channel setup complete.");
  });

  client.on("interactionCreate", async (interaction) => {
    if (!interaction.isButton() && !interaction.isSelectMenu()) return;

    const customId = interaction.customId;

    if (interaction.isButton()) {
      switch (customId) {
        case "create_survey":
          await interaction.update({
            content: "Create Survey Options:",
            embeds: [],
            components: [createSurveyActionRow],
          });
          break;

        case "survey_management":
          await interaction.update({
            content: "Survey Management Options:",
            embeds: [],
            components: [surveyManagementActionRow],
          });
          break;

        case "view_results":
          await interaction.update({
            content: "View Results Options:",
            embeds: [],
            components: [
              viewResultsActionRow1,
              publicResultsDropdown,
              viewResultsActionRow2,
            ],
          });
          break;

        case "survey_leaderboard":
          await interaction.update({
            content: "Survey Leaderboard Options:",
            embeds: [],
            components: [surveyLeaderboardActionRow],
          });
          break;

        // Sub-buttons for Create Survey
        case "single_response":
          await handleCreate(interaction, "create", "");
          break;
        case "multiple_response":
          await handleCreate(interaction, "create-multi-response",create_multi_cmd);
          break;

        // Sub-buttons for Survey Management
        case "edit_survey":
          await handleEdit(interaction, redisClient);
          break;
        case "survey_status":
          await handleSetStatus(interaction, redisClient);
          break;
        case "delete_survey":
          await handleDelete(redisClient, interaction);
          break;
        case "survey_info":
          await handleInfo(interaction, version);
          break;
        case "post_survey":
          await handleRespond(interaction);
          break;

        // Sub-buttons for View Results
        case "public_results":
          await interaction.reply({
            content: "Please select a summary type.",
            components: [publicResultsDropdown],
            ephemeral: true,
          });
          break;
        case "mf_data":
          await handleView(interaction, "mf_data", redisClient);
          break;

        // Dropdowns
        case "start_auto_post":
          await handleAutoPost(interaction, "start", client, redisClient);
          break;
        case "stop_auto_post":
          await handleAutoPost(interaction, "stop", client, redisClient);
          break;

        // Sub-buttons for Survey Leaderboard
        case "create_leaderboard":
          await handleLeaderboard(interaction, redisClient);
          break;
        case "edit_survey_count":
          await handleEditSurveyCount(interaction);
          break;
        case "view_general_counts":
          await handleViewSurveyCounts(interaction, redisClient);
          break;
        case "view_discord_counts":
          await handleViewDiscordSurveyCounts(interaction, redisClient);
          break;

        default:
          await interaction.reply({
            content: "Unknown action",
            ephemeral: true,
          });
          break;
      }
    } else if (interaction.isSelectMenu()) {
      const values = interaction.values;
      switch (interaction.customId) {
        case "public_results_dropdown":
          if (values.includes("high_level_summary")) {
            await handleSummary(interaction, "high_level");
          } else if (values.includes("detailed_summary")) {
            await handleSummary(interaction, "detailed");
          }
          break;
        case "auto_post_dropdown":
          if (values.includes("start_auto_post")) {
            await handleAutoPost(interaction, "start", client, redisClient);
          } else if (values.includes("stop_auto_post")) {
            await handleAutoPost(interaction, "stop", client, redisClient);
          }
          break;
        default:
          await interaction.reply({
            content: "Unknown menu action",
            ephemeral: true,
          });
          break;
      }
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

  await client.login(discordConfig.token);
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
