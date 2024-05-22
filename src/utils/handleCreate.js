import {
  ModalBuilder,
  TextInputBuilder,
  ActionRowBuilder,
  TextInputStyle,
} from "discord.js";

const createModal = async (interaction, type, surveyName) => {
  const modal = new ModalBuilder()
    .setCustomId(`createModal-${type}-${surveyName}`)
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
};

export const handleCreate = async (interaction, subcommand, createMultiCmd) => {
  const type = subcommand === createMultiCmd ? "multi" : "single";
  const surveyName = interaction.options.getString("survey");
  await createModal(interaction, type, surveyName);
};
