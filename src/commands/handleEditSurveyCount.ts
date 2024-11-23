import {
  ModalBuilder,
  TextInputBuilder,
  ActionRowBuilder,
  TextInputStyle,
  ChatInputCommandInteraction,
} from "discord.js";

const editSurveyCountModal = async (
  interaction: ChatInputCommandInteraction,
) => {
  const modal = new ModalBuilder()
    .setCustomId(`editSurveyCountModal`)
    .setTitle("Edit Survey Count");

  const usernameInput = new TextInputBuilder()
    .setCustomId("usernameInput")
    .setLabel("USERNAME")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(45)
    .setRequired(true);

  const countInput = new TextInputBuilder()
    .setCustomId("countInput")
    .setLabel("Edit Survey Count +/-NUMBER")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(10)
    .setRequired(true);

  const pointsInput = new TextInputBuilder()
    .setCustomId("pointsInput")
    .setLabel("Edit Survey Points +/-POINTS")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(10)
    .setRequired(true);

  const firstActionRow = new ActionRowBuilder().addComponents(usernameInput);
  const secondActionRow = new ActionRowBuilder().addComponents(countInput);
  const thirdActionRow = new ActionRowBuilder().addComponents(pointsInput);

  modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

  await interaction.showModal(modal);
};

export const handleEditSurveyCount = async (interaction: any) => {
  await editSurveyCountModal(interaction);
};
