import log from "./logger";
import { setIntervalAsync } from "set-interval-async/dynamic";
import { startAutoPosting } from "./lib/startAutoPosting.js";
import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
} from "discord.js";
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
  createSurveyActionRow,
  surveyManagementActionRow,
  surveyLeaderboardActionRow,
} from "@commands/index";

import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { discordConfig, POST_CHANNEL_ID, version } from "@config";
import {
  create_multi_cmd,
  maxResponsesForMultiResponsePerUser,
} from "@constants";
import { threadPost } from "@lib/threadPost";
import { deleteThreadPost } from "@lib/deleteThreadPost";
import { updateThreadPost } from "@lib/updateThreadPost";
import { postSurvey } from "@lib/postSurvey";

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
      let command = "view";
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
        content: "View Results",
        embeds: [],
        components: [selectMenu],
      });

      break;
    case `view_public_results-${surveyName}`: {
      const modal = new ModalBuilder()
        .setCustomId(`viewPublicModal-${surveyName}`)
        .setTitle("View Public Results");

      const channelIdInput = new TextInputBuilder()
        .setCustomId("channelId")
        .setLabel("Channel ID to post the results")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
        channelIdInput,
      );
      modal.addComponents(row);

      await interaction.showModal(modal);
      break;
    }
    case `view_high_level_results-${surveyName}`: {
      const modal = new ModalBuilder()
        .setCustomId(`viewHighLevelModal-${surveyName}`)
        .setTitle("View High-Level Results");

      const channelIdInput = new TextInputBuilder()
        .setCustomId("channelId")
        .setLabel("Channel ID to post the results")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
        channelIdInput,
      );
      modal.addComponents(row);

      await interaction.showModal(modal);
      break;
    }
    case `view_mf_data-${surveyName}`: {
      const modal = new ModalBuilder()
        .setCustomId(`viewMFModal-${surveyName}`)
        .setTitle("View MF Data");

      const channelIdInput = new TextInputBuilder()
        .setCustomId("channelId")
        .setLabel("Channel ID to post the results")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
        channelIdInput,
      );
      modal.addComponents(row);

      await interaction.showModal(modal);
      break;
    }
    case `start_auto_post-${surveyName}`: {
      const modal = new ModalBuilder()
        .setCustomId(`startAutoPostModal-${surveyName}`)
        .setTitle("Start Auto Post");

      const channelIdInput = new TextInputBuilder()
        .setCustomId("channelId")
        .setLabel("Channel ID to start auto-posting")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
        channelIdInput,
      );
      modal.addComponents(row);

      await interaction.showModal(modal);
      break;
    }

    case `stop_auto_post-${surveyName}`: {
      const modal = new ModalBuilder()
        .setCustomId(`stopAutoPostModal-${surveyName}`)
        .setTitle("Stop Auto Post");

      const channelIdInput = new TextInputBuilder()
        .setCustomId("channelId")
        .setLabel("Channel ID to stop auto-posting")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const row = new ActionRowBuilder<TextInputBuilder>().addComponents(
        channelIdInput,
      );
      modal.addComponents(row);

      await interaction.showModal(modal);
      break;
    }
    case "survey_leaderboard":
      await interaction.deferReply({ ephemeral: true });
      await interaction.followUp({
        content: "Survey Leaderboard Options:",
        embeds: [],
        components: [surveyLeaderboardActionRow],
      });
      break;
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
    case `respondButton-${surveyName}`:
      const { user } = interaction;
      const username = user.username;

      await handleRespondButton(
        interaction,
        surveyName,
        redisClient,
        username,
        maxResponsesForMultiResponsePerUser,
      );
      break;
    case "edit_survey":
      await handleSurveyDropdown(interaction, client, redisClient, "edit");
      break;
    case "survey_status":
      await interaction.deferReply({ ephemeral: true });

      const surveysForStatus = await redisClient.sMembers("surveys");

      const statusOptions = surveysForStatus.map((survey) => ({
        label: survey,
        value: survey,
      }));

      if (statusOptions.length === 0) {
        await interaction.followUp({
          content: "No surveys available to update status.",
          ephemeral: true,
        });
        break;
      }

      const statusDropdownMenu = {
        type: 1,
        components: [
          {
            type: 3,
            custom_id: `status_survey_dropdown`,
            placeholder: "Select a survey to update its status",
            options: statusOptions,
          },
        ],
      };

      await interaction.followUp({
        content: "Select a survey to update its status:",
        components: [statusDropdownMenu],
        ephemeral: true,
      });
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
    case "respond_survey":
      await handleSurveyDropdown(interaction, client, redisClient, "respond");
      break;
    case "post_survey":
      await handleSurveyDropdown(interaction, client, redisClient, "post");
      break;
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
      if (customId.startsWith("statusToggle")) {
        const [_, surveyToToggle, action] = customId.split("-");
        const newStatus = action === "activate" ? "activate" : "deactivate";

        await handleSetStatus(
          interaction,
          surveyToToggle,
          newStatus,
          redisClient,
        );

        await interaction.reply({
          content: `Survey **${surveyToToggle}** has been successfully ${
            action === "activate" ? "activated" : "deactivated"
          }.`,
          ephemeral: true,
        });
        log.info(`Survey ${surveyToToggle} status updated to ${newStatus}.`);
      } else {
        await interaction.reply({
          content: "Unknown action",
          ephemeral: true,
        });
      }
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

    return;
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
      const selectedSurveyToEdit = interaction.values[0]; // Get the selected survey

      await handleEdit(interaction, redisClient, selectedSurveyToEdit);
      break;

    case "delete_survey_dropdown":
      const selectedSurveyToDelete = interaction.values[0]; // Get the selected survey

      await handleDelete(interaction, redisClient, selectedSurveyToDelete);
      break;

    case "view_survey_dropdown":
      const selectedSurvey = interaction.values[0]; // Get the selected survey
      await interaction.deferReply({ ephemeral: true });

      await interaction.followUp({
        content: `What results would you like to see for the survey: ${selectedSurvey}?`,
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                label: "Public Results",
                style: 1,
                custom_id: `view_public_results-${selectedSurvey}`,
              },
              {
                type: 2,
                label: "High-Level Results",
                style: 1,
                custom_id: `view_high_level_results-${selectedSurvey}`,
              },
              {
                type: 2,
                label: "MF Data",
                style: 1,
                custom_id: `view_mf_data-${selectedSurvey}`,
              },
              {
                type: 2,
                label: "Start Auto Post",
                style: 1,
                custom_id: `start_auto_post-${selectedSurvey}`,
              },
              {
                type: 2,
                label: "Stop Auto Post",
                style: 2,
                custom_id: `stop_auto_post-${selectedSurvey}`,
              },
            ],
          },
        ],
        ephemeral: true,
      });

      break;
    case "status_survey_dropdown":
      await interaction.deferReply({ ephemeral: true });
      const selectedSurveyForStatus = interaction.values[0];

      const currentStatus = await redisClient.get(
        `survey:${selectedSurveyForStatus}:is-active`,
      );

      const toggleStatus = currentStatus === "true" ? "deactivate" : "activate";

      await interaction.followUp({
        content: `The current status of **${selectedSurveyForStatus}** is **${
          currentStatus === "true" ? "Active" : "Inactive"
        }**. Would you like to ${toggleStatus} it?`,
        components: [
          {
            type: 1,
            components: [
              {
                type: 2,
                label:
                  toggleStatus.charAt(0).toUpperCase() + toggleStatus.slice(1),
                style: toggleStatus === "activate" ? 3 : 4,
                custom_id: `statusToggle-${selectedSurveyForStatus}-${toggleStatus}`,
              },
            ],
          },
        ],
        ephemeral: true,
      });
      break;

    case "respond_survey_dropdown":
      const selectedSurveyToRespond = interaction.values[0];
      const modal = new ModalBuilder()
        .setCustomId(`postRespondModal-${selectedSurveyToRespond}`)
        .setTitle("Post Respond Survey Button");

      const channelIdInput = new TextInputBuilder()
        .setCustomId("channelId")
        .setLabel("Channel ID to post the respond button")
        .setStyle(TextInputStyle.Short)
        .setRequired(false);

      const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
        channelIdInput,
      );

      modal.addComponents(firstRow);

      await interaction.showModal(modal);
      break;
    case "post_survey_dropdown":
      await interaction.deferReply({ ephemeral: true });
      const selectedSurveyToPost = interaction.values[0];

      await postSurvey(
        client,
        redisClient,
        selectedSurveyToPost,
        POST_CHANNEL_ID,
      );
      await interaction.editReply({ content: "Survey posted successfully!" });
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
  } else if (interaction.customId.startsWith("startAutoPostModal-")) {
    const surveyName = interaction.customId.split("-").slice(1).join("-");

    const channelId = interaction.fields.getTextInputValue("channelId");

    await handleAutoPost(
      interaction,
      "start",
      client,
      redisClient,
      surveyName,
      channelId,
    );
  } else if (interaction.customId.startsWith("stopAutoPostModal-")) {
    const surveyName = interaction.customId.split("-").slice(1).join("-");
    const channelId = interaction.fields.getTextInputValue("channelId");

    await handleAutoPost(
      interaction,
      "stop",
      client,
      redisClient,
      surveyName,
      channelId,
    );
  } else if (interaction.customId.startsWith("postRespondModal-")) {
    const surveyName = interaction.customId.split("-").slice(1).join("-");
    const channelId = interaction.fields.getTextInputValue("channelId");

    await handleRespond(
      redisClient,
      interaction,
      surveyName,
      channelId,
      client,
    );
  } else if (interaction.customId.startsWith("viewPublicModal-")) {
    const surveyName = interaction.customId.split("-").slice(1).join("-");
    const channelId = interaction.fields.getTextInputValue("channelId");

    await handleSummary(interaction, surveyName, redisClient, "no", channelId);
  } else if (interaction.customId.startsWith("viewHighLevelModal-")) {
    const surveyName = interaction.customId.split("-").slice(1).join("-");
    const channelId = interaction.fields.getTextInputValue("channelId");

    await handleSummary(interaction, surveyName, redisClient, "yes", channelId);
  } else if (interaction.customId.startsWith("viewMFModal-")) {
    const surveyName = interaction.customId.split("-").slice(1).join("-");
    const channelId = interaction.fields.getTextInputValue("channelId");

    await handleView(interaction, surveyName, redisClient, channelId);
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
