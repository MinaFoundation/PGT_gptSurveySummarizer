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

  const modal = new ModalBuilder()
    .setCustomId(`editModal-${type}-${surveyName}`)
    .setTitle("Edit Survey");

  const titleInput = new TextInputBuilder()
    .setCustomId("titleInput")
    .setLabel("Edit your survey title?")
    .setStyle(TextInputStyle.Short)
    .setPlaceholder(surveyTitle)
    .setMaxLength(45)
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
        : `Edit questions line separated field names`,
    )
    .setStyle(TextInputStyle.Paragraph)
    .setMaxLength(
      type === "single" ? 45 : 45 * maxResponsesForMultiResponsePerUser * 2,
    )
    .setPlaceholder(trimString(surveyFields))
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
  if (surveyName !== updatedSurveyName) {
    await redisClient.rename(
      `survey:${surveyName}:summary`,
      `survey:${updatedSurveyName}:summary`,
    );
    await redisClient.rename(
      `survey:${surveyName}:type`,
      `survey:${updatedSurveyName}:type`,
    );
    await redisClient.rename(
      `survey:${surveyName}:title`,
      `survey:${updatedSurveyName}:title`,
    );
    await redisClient.rename(
      `survey:${surveyName}:description`,
      `survey:${updatedSurveyName}:description`,
    );
    await redisClient.rename(
      `survey:${surveyName}:fields`,
      `survey:${updatedSurveyName}:fields`,
    );
    await redisClient.rename(
      `survey:${surveyName}:username`,
      `survey:${updatedSurveyName}:username`,
    );
    await redisClient.rename(
      `survey:${surveyName}:last-edit-time`,
      `survey:${updatedSurveyName}:last-edit-time`,
    );
    await redisClient.rename(
      `survey:${surveyName}:last-summary-time`,
      `survey:${updatedSurveyName}:last-summary-time`,
    );

    await redisClient.sRem("surveys", surveyName);
    await redisClient.sAdd("surveys", updatedSurveyName);

    await redisClient.set(`survey:${updatedSurveyName}:type`, surveyType);
    await redisClient.set(
      `survey:${updatedSurveyName}:title`,
      updatedSurveyName,
    );
    await redisClient.set(
      `survey:${updatedSurveyName}:description`,
      description,
    );
    await redisClient.set(`survey:${updatedSurveyName}:fields`, fields);
    await redisClient.set(`survey:${updatedSurveyName}:username`, username);
    await redisClient.set(
      `survey:${updatedSurveyName}:last-edit-time`,
      Date.now(),
    );
  } else {
    await redisClient.set(`survey:${surveyName}:type`, surveyType);
    await redisClient.set(`survey:${surveyName}:description`, description);
    await redisClient.set(`survey:${surveyName}:fields`, fields);
    await redisClient.set(`survey:${surveyName}:username`, username);
    await redisClient.set(`survey:${surveyName}:last-edit-time`, Date.now());
  }
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
