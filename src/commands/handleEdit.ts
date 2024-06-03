import { maxResponsesForMultiResponsePerUser } from "@constants";
import {
  ModalBuilder,
  TextInputBuilder,
  ActionRowBuilder,
  TextInputStyle,
  ChatInputCommandInteraction,
} from "discord.js";

const editModal = async (
  interaction: ChatInputCommandInteraction,
  type: string,
  surveyName: string,
  redisClient: any,
) => {
  if (!(await redisClient.sIsMember("surveys", surveyName))) {
    await interaction.reply({
      content: "There is no survey with that name",
      ephemeral: true,
    });
    return;
  }

  const surveyTitle = await redisClient.get(`survey:${surveyName}:title`);
  const surveyDescription = await redisClient.get(
    `survey:${surveyName}:description`,
  );

  const surveyFields = await redisClient.get(`survey:${surveyName}:fields`);
  const stringFields: string =
    type === "single" ? surveyFields : surveyFields.join("\n");

  const modal = new ModalBuilder()
    .setCustomId(`editModal-${type}-${surveyName}`)
    .setTitle("Edit Survey");

  const titleInput = new TextInputBuilder()
    .setCustomId("titleInput")
    .setLabel("Edit your survey title?")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(surveyTitle)
    .setMaxLength(80)
    .setRequired(false);

  const descriptionInput = new TextInputBuilder()
    .setCustomId("descriptionInput")
    .setLabel("Write a short description for your survey")
    .setPlaceholder(trimString(surveyDescription))
    .setStyle(TextInputStyle.Paragraph)
    .setRequired(false);

  const fieldsInput = new TextInputBuilder()
    .setCustomId("fieldsInput")
    .setLabel(
      type === "single"
        ? "Edit your question"
        : `Edit questions up to ${maxResponsesForMultiResponsePerUser} line separated field names`,
    )
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(
      type === "single" ? 45 : 45 * maxResponsesForMultiResponsePerUser * 2,
    )
    .setPlaceholder(trimString(stringFields))
    .setRequired(false);

  const firstActionRow = new ActionRowBuilder().addComponents(titleInput);
  const secondActionRow = new ActionRowBuilder().addComponents(
    descriptionInput,
  );
  const thirdActionRow = new ActionRowBuilder().addComponents(fieldsInput);

  modal.addComponents(firstActionRow, secondActionRow, thirdActionRow);

  await interaction.showModal(modal);
};

export const handleEdit = async (
  interaction: ChatInputCommandInteraction,
  redisClient: any,
  surveyName: any,
) => {
  const surveyType = await redisClient.get(`survey:${surveyName}:type`);
  await editModal(interaction, surveyType, surveyName, redisClient);
};

export const editSurvey = async (
  redisClient: any,
  surveyName: string,
  updatedSurveyName: string,
  surveyType: string,
  description: string,
  fields: any,
  username: string,
) => {
  const surveyExists = await redisClient.sIsMember("surveys", surveyName);

  if (!surveyExists) {
    await redisClient.sAdd("surveys", surveyName);
    const initialSummaryJSON = JSON.stringify({});
    await redisClient.set(`survey:${surveyName}:summary`, initialSummaryJSON);
    await redisClient.set(`survey:${surveyName}:last-summary-time`, Date.now());
  }

  await redisClient.set(`survey:${surveyName}:type`, surveyType);
  await redisClient.set(`survey:${surveyName}:title`, updatedSurveyName);
  await redisClient.set(`survey:${surveyName}:description`, description);
  await redisClient.set(`survey:${surveyName}:fields`, fields);
  await redisClient.set(`survey:${surveyName}:username`, username);
  await redisClient.set(`survey:${surveyName}:last-edit-time`, Date.now());
};

function trimString(input: string): string {
  const maxLength = 99;
  const ellipsis = "...";

  if (input.length > maxLength) {
    const trimLength = maxLength - ellipsis.length;
    return input.substring(0, trimLength) + ellipsis;
  }

  return input;
}
