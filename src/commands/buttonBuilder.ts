import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
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

export const buttonList = [];
