import {
  ActionRowBuilder,
  ButtonBuilder,
  StringSelectMenuBuilder,
  ButtonStyle,
  StringSelectMenuOptionBuilder,
  EmbedBuilder,
  AnyComponentBuilder,
} from "discord.js";

export const adminActionRow = new ActionRowBuilder().addComponents(
  new ButtonBuilder()
    .setCustomId("create_survey")
    .setLabel("Create Survey")
    .setStyle(ButtonStyle.Primary),
  new ButtonBuilder()
    .setCustomId("survey_management")
    .setLabel("Survey Management")
    .setStyle(ButtonStyle.Primary),
  new ButtonBuilder()
    .setCustomId("view_results")
    .setLabel("View Leaderboard")
    .setStyle(ButtonStyle.Primary),
  new ButtonBuilder()
    .setCustomId("survey_leaderboard")
    .setLabel("Survey Leaderboard")
    .setStyle(ButtonStyle.Primary),
);

export const adminEmbed = new EmbedBuilder()
  .setColor(0x2e59d9)
  .setTitle("🛠️ Admin Dashboard")
  .setDescription(
    "Welcome to the Admin Dashboard. Please select a category to manage:",
  )
  .addFields(
    {
      name: "🗳️ Create Survey",
      value: "Create single or multiple choice surveys",
      inline: false,
    },
    { name: "📝 Survey Management", value: "Manage Surveys", inline: false },
    { name: "📊  View Results", value: "View Data", inline: false },
    {
      name: "🏆 Survey Leaderboard",
      value: "Leaderboard functions",
      inline: false,
    },
  );

// SUB BUTTONS
// Sub-buttons for "Create Survey"
export const createSurveyActionRow =
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("single_response")
      .setLabel("Single-response")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("multiple_response")
      .setLabel("Multiple-response")
      .setStyle(ButtonStyle.Primary),
  );

// Sub-buttons for "Survey Management"
export const surveyManagementActionRow =
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("edit_survey")
      .setLabel("Edit Survey")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("survey_status")
      .setLabel("Survey Status")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("delete_survey")
      .setLabel("Delete Survey")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId("survey_info")
      .setLabel("Survey Info")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("post_survey")
      .setLabel("Post Survey to Channel")
      .setStyle(ButtonStyle.Primary),
  );

// Sub-buttons for "View Results"
export const viewResultsActionRow1 =
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("public_results")
      .setLabel("Public Results")
      .setStyle(ButtonStyle.Primary),
  );

export const publicResultsDropdown = new ActionRowBuilder<any>().addComponents(
  new StringSelectMenuBuilder()
    .setCustomId("public_results_dropdown")
    .setPlaceholder("Select summary type")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("High-level Summary")
        .setValue("high_level_summary"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Detailed Level Summary")
        .setValue("detailed_summary"),
    ),
);

export const viewResultsActionRow2 =
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("mf_data")
      .setLabel("MF Data")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("auto_post")
      .setLabel("Auto Post")
      .setStyle(ButtonStyle.Primary),
  );

export const autoPostDropdown = new ActionRowBuilder().addComponents(
  new StringSelectMenuBuilder()
    .setCustomId("auto_post_dropdown")
    .setPlaceholder("Select auto-post action")
    .addOptions(
      new StringSelectMenuOptionBuilder()
        .setLabel("Start Auto Post")
        .setValue("start_auto_post"),
      new StringSelectMenuOptionBuilder()
        .setLabel("Stop Auto Post")
        .setValue("stop_auto_post"),
    ),
);

// Sub-buttons for "Survey Leaderboard"
export const surveyLeaderboardActionRow =
  new ActionRowBuilder<ButtonBuilder>().addComponents(
    new ButtonBuilder()
      .setCustomId("create_leaderboard")
      .setLabel("Create Leaderboard")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("edit_survey_count")
      .setLabel("Edit Survey Count")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId("view_general_counts")
      .setLabel("View General Survey Counts")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId("view_discord_counts")
      .setLabel("View Discord Survey Counts")
      .setStyle(ButtonStyle.Primary),
  );
