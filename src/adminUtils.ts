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

import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { discordConfig, version } from "@config";
import { create_multi_cmd } from "@constants";
import { threadPost } from "@lib/threadPost";
import { deleteThreadPost } from "@lib/deleteThreadPost";
import { updateThreadPost } from "@lib/updateThreadPost";

export const handleInteraction = async (interaction, client, redisClient) => {
  if (interaction.isButton()) {
    await handleButtons(interaction, client, redisClient);
  } else if (interaction.isStringSelectMenu()) {
    await handleSelectMenus(interaction, client, redisClient);
  } else if (interaction.isModalSubmit()) {
    await handleModals(interaction, client, redisClient);
  }
};

export const cleanUpAdminChannel = async (adminChannel) => {
  try {
    const messages = await adminChannel.messages.fetch({ limit: 100 });
    const botMessages = messages.filter(
      (msg) => msg.author.id === adminChannel.client.user.id,
    );

    for (const message of botMessages.values()) {
      await message
        .delete()
        .catch((err) => log.error("Error deleting message:", err));
    }

    log.info("Cleared previous bot messages in admin channel.");
  } catch (error) {
    log.error("Error cleaning up admin channel:", error);
  }
};

// Setup Admin Channel
export const setupAdminChannel = async (adminChannel, client) => {
  try {
    await adminChannel.send({
      embeds: [adminEmbed],
      components: [adminActionRow],
      ephemeral: true,
    });

    log.info("Admin channel setup complete.");
  } catch (error) {
    log.error("Error setting up admin channel:", error);
  }
};

export const handleButtons = async (interaction, client, redisClient) => {
  const customId = interaction.customId;
  const surveyName = customId.split("-").slice(1).join("-");

  switch (customId) {
    case "create_survey":
      await interaction.deferReply({ ephemeral: true });
      await interaction.followUp({
        content: "** Create Survey Options: ** ",
        components: [createSurveyActionRow],
        ephemeral: true,
      });
      break;

    case "survey_management":
      await interaction.deferReply({ ephemeral: true });
      await interaction.followUp({
        content: "**Survey Management Options:**",
        embeds: [],
        components: [surveyManagementActionRow],
      });
      break;

    case "view_results":
      await interaction.deferReply({ ephemeral: true });
      await interaction.followUp({
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
      await interaction.deferReply({ ephemeral: true });
      await interaction.followUp({
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
      await handleCreate(
        interaction,
        "create-multi-response",
        create_multi_cmd,
      );
      break;

    case "edit_survey":
      await handleSurveyDropdown(interaction, client, redisClient, "edit");
      break;

    case "survey_status":
      await handleSetStatus(interaction, redisClient);
      break;
    case "delete_survey":
      await handleSurveyDropdown(interaction, client, redisClient, "delete");
      break;
    case `deleteButton-${surveyName}`:
      await handleDeleteButton(interaction, surveyName);
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
};

const handleSurveyDropdown = async (
  interaction,
  client,
  redisClient,
  command,
) => {
  await interaction.deferReply({ ephemeral: true });
  const surveys = await redisClient.sMembers("surveys");

  const options = surveys.map((survey) => ({
    label: survey,
    value: survey,
  }));

  if (options.length === 0) {
    await interaction.followUp({
      content: `No surveys available to ${command}.`,
      ephemeral: true,
    });
  }

  const selectMenu = {
    type: 1,
    components: [
      {
        type: 3,
        custom_id: `${command}_survey_dropdown`,
        placeholder: `Select a survey to ${command}`,
        options,
      },
    ],
  };

  await interaction.followUp({
    content: `Please select a survey to ${command}:`,
    components: [selectMenu],
    ephemeral: true,
  });
};

export const handleSelectMenus = async (interaction, client, redisClient) => {
  const customId = interaction.customId;

  switch (customId) {
    case "public_results_dropdown":
      const values = interaction.values;
      if (values.includes("high_level_summary")) {
        await interaction.reply({ content: "High-Level Summary selected." });
      }
      break;

    case "edit_survey_dropdown":
      const selectedSurvey = interaction.values[0]; // Get the selected survey

      await handleEdit(interaction, redisClient, selectedSurvey);
      break;

    case "delete_survey_dropdown":
      const selectedSurveyToDelete = interaction.values[0]; // Get the selected survey

      await handleDelete(interaction, redisClient, selectedSurveyToDelete);
      break;

    default:
      await interaction.reply({
        content: "Unknown menu action.",
        ephemeral: true,
      });
  }
};

export const handleModals = async (interaction, client, redisClient) => {
  const { user } = interaction;
  const username = user.username;

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
  } else if (interaction.customId.startsWith("editSurveyCountModal")) {
    await handleEditSurveyCountModal(interaction, username, redisClient);
  } else if (interaction.customId.startsWith("deleteModal")) {
    const [isDeleted, sn] = await handleDeleteModal(
      interaction,
      username,
      redisClient,
    );
    if (isDeleted) {
      await deleteThreadPost(client, sn);
    }
  } else if (interaction.customId.startsWith("editModal")) {
    const [sn, upSn, desc, fields, shouldPosted, isUpdated] =
      await handleEditModal(interaction, username, redisClient);

    if (isUpdated && shouldPosted) {
      await updateThreadPost(
        interaction,
        client,
        redisClient,
        sn,
        upSn,
        desc,
        fields,
      );
    } else if (isUpdated && !shouldPosted) {
      await updateThreadPost(
        interaction,
        client,
        redisClient,
        sn,
        upSn,
        desc,
        fields,
      );
    } else if (!isUpdated && shouldPosted) {
      await deleteThreadPost(client, sn);
      await threadPost(client, redisClient, sn, desc, fields);
    }
  }
};

export const checkAndUpdateSurveyStatus = async (redisClient: any) => {
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
