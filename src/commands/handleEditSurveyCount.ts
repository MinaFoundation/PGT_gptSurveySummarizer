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

  const firstActionRow = new ActionRowBuilder().addComponents(usernameInput);
  const secondActionRow = new ActionRowBuilder().addComponents(countInput);

  modal.addComponents(firstActionRow, secondActionRow);

  await interaction.showModal(modal);
};

export const handleEditSurveyCount = async (interaction: any) => {
  await editSurveyCountModal(interaction);
};
