import { maxResponsesForMultiResponsePerUser } from "@constants";
import {
  ModalBuilder,
  TextInputBuilder,
  ActionRowBuilder,
  TextInputStyle,
  ChatInputCommandInteraction,
} from "discord.js";

const createModal = async (
  interaction: ChatInputCommandInteraction,
  type: string,
  surveyName: string,
) => {
  const modal = new ModalBuilder()
    .setCustomId(`createModal-${type}-${surveyName}`)
    .setTitle("Create Survey");

  const titleInput = new TextInputBuilder()
    .setCustomId("titleInput")
    .setLabel("What is your survey title?")
    .setStyle(TextInputStyle.Short)
    .setMaxLength(45)
    .setRequired(true);

  const descriptionInput = new TextInputBuilder()
    .setCustomId("descriptionInput")
    .setLabel("Write a short description for your survey")
    .setStyle(TextInputStyle.Paragraph);

  const fieldsInput = new TextInputBuilder()
    .setCustomId("fieldsInput")
    .setLabel(
      type === "single"
        ? "Write your question"
        : `Up to ${maxResponsesForMultiResponsePerUser} line separated field names`,
    )
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(
      type === "single" ? 45 : 45 * maxResponsesForMultiResponsePerUser * 2,
    )
    .setPlaceholder(
      type === "single"
        ? "Enter your question Max 45 character."
        : `Enter up to ${maxResponsesForMultiResponsePerUser} fields, each field(line) up to 45 chars.`,
    );

  const firstActionRow = new ActionRowBuilder().addComponents(titleInput);
  const secondActionRow = new ActionRowBuilder().addComponents(
    descriptionInput,
  );
  const thirdActionRow = new ActionRowBuilder().addComponents(fieldsInput);

  modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

  await interaction.showModal(modal);
};

export const handleCreate = async (
  interaction: ChatInputCommandInteraction,
  subcommand: string,
  createMultiCmd: string,
) => {
  const type = subcommand === createMultiCmd ? "multi" : "single";
  const surveyName = interaction.options.getString("survey");
  await createModal(interaction, type, surveyName);
};
