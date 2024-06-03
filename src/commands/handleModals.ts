import { createSurvey } from "../lib/createSurvey.js";
import { editSurvey } from "./handleEdit.js";
import { respond } from "./handleRespond.js";
import { maxResponsesForMultiResponsePerUser } from "../constants.js";

export const handleCreateModal = async (
  interaction: any,
  username: any,
  redisClient: any,
) => {
  const [surveyType, surveyName] = interaction.customId.split("-").slice(1);
  const title = interaction.fields.getTextInputValue("titleInput");
  const description = interaction.fields.getTextInputValue("descriptionInput");
  const fields = interaction.fields.getTextInputValue("fieldsInput");

  if (await redisClient.sIsMember("surveys", surveyName)) {
    await interaction.reply({
      content: "A survey with that name already exists",
      ephemeral: true,
    });
  } else {
    await createSurvey(
      redisClient,
      title,
      surveyType,
      description,
      fields,
      username,
    );
    await interaction.reply({
      content: "Your Survey was created successfully!",
      ephemeral: true,
    });
  }
};

export const handleEditModal = async (
  interaction: any,
  username: any,
  redisClient: any,
) => {
  const [surveyType, surveyName] = interaction.customId.split("-").slice(1);
  const title = interaction.fields.getTextInputValue("titleInput");
  const description = interaction.fields.getTextInputValue("descriptionInput");
  const fields = interaction.fields.getTextInputValue("fieldsInput");

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

  let updatedTitle = surveyTitle;
  let updatedDescription = surveyDescription;
  let updatedFields = surveyFields;
  let updated = false;

  if (title && title !== surveyTitle) {
    updatedTitle = title;
    updated = true;
  }

  if (description && description !== surveyDescription) {
    updatedDescription = description;
    updated = true;
  }

  if (fields && fields !== surveyFields) {
    updatedFields = fields;
    updated = true;
  }

  if (updated) {
    await editSurvey(
      redisClient,
      surveyName,
      updatedTitle,
      surveyType,
      updatedDescription,
      updatedFields,
      username,
    );
    await interaction.reply({
      content: "Your Survey was updated successfully!",
      ephemeral: true,
    });
  } else {
    await interaction.reply({
      content: "No changes were made as the input values were the same.",
      ephemeral: true,
    });
  }
};

export const handleRespondModal = async (
  interaction: any,
  username: any,
  redisClient: any,
) => {
  const surveyName = interaction.customId.split("-").slice(1).join("-");
  const surveyType = await redisClient.get(`survey:${surveyName}:type`);
  const plural = surveyType === "single" ? "" : "s";
  let response: any;
  if (surveyType === "single") {
    response = interaction.fields.getTextInputValue("responseInput");
  } else {
    const description = await redisClient.get(
      `survey:${surveyName}:description`,
    );
    const fields = await redisClient.get(`survey:${surveyName}:fields`);
    const multipleQuestions = fields.split("\n");

    const responses = new Array(multipleQuestions.length)
      .fill(null)
      .map((_, i) =>
        interaction.fields.getTextInputValue(`responseInput-${i}`),
      );
    response = JSON.stringify(responses);
  }
  const hadResponse = await redisClient.hExists(
    `survey:${surveyName}:responses`,
    username,
  );
  await respond(redisClient, surveyName, username, response);

  await interaction.reply({
    content: `Your Response was ${hadResponse ? "updated" : "added"} successfully!`,
    ephemeral: true,
  });
};
