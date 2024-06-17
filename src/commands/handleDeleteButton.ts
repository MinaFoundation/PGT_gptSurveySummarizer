import {
  ModalBuilder,
  TextInputBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  TextInputStyle,
  ButtonStyle,
} from "discord.js";

export const handleDeleteButton = async (interaction: any, surveyName: any) => {
  const modal = new ModalBuilder()
    .setCustomId(`deleteModal-${surveyName}`)
    .setTitle(`Delete Survey`);

  const yesInput = new TextInputBuilder()
    .setCustomId(`confirmDelete-${surveyName}`)
    .setLabel("Please rewrite the surveyName to delete.")
    .setStyle(TextInputStyle.Paragraph)
    .setValue(
      `Survey ${surveyName} will be deleted.`,
    );
  modal.addComponents(new ActionRowBuilder().addComponents(yesInput));

  await interaction.showModal(modal);
};
