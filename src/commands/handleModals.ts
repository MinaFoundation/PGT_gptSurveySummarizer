import { createSurvey } from "../lib/createSurvey.js";
import { editSurvey } from "./handleEdit.js";
import { respond } from "./handleRespond.js";
import { MAX_TIMESTAMP } from "../constants.js";
import { deleteSurvey } from "./handleDelete.js";

export const handleCreateModal = async (
  interaction: any,
  username: any,
  redisClient: any,
) => {
  const [surveyType, surveyName] = interaction.customId.split("-").slice(1);
  const title = interaction.fields.getTextInputValue("titleInput");
  const description = interaction.fields.getTextInputValue("descriptionInput");
  const fields = interaction.fields.getTextInputValue("fieldsInput");
  let endTime = interaction.fields.getTextInputValue("endTimeInput");

  if (!(endTime == "inf" || endTime == "" || endTime == "INF")) {
    endTime = convertToTimestamp(endTime);
  } else {
    endTime = MAX_TIMESTAMP;
  }

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
      endTime,
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
  let endTime = interaction.fields.getTextInputValue("endTimeInput");

  if (!(endTime == "inf" || endTime == "" || endTime == "INF")) {
    endTime = convertToTimestamp(endTime);
  } else {
    endTime = MAX_TIMESTAMP;
  }

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
  const surveyEndTime = await redisClient.get(`survey:${surveyName}:endtime`);

  let updatedTitle = surveyTitle;
  let updatedDescription = surveyDescription;
  let updatedFields = surveyFields;
  let updatedEndTime = surveyEndTime;

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

  if (endTime && endTime !== surveyEndTime) {
    updatedEndTime = endTime;
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
      updatedEndTime,
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

export const handleDeleteModal = async (
  interaction: any,
  username: any,
  redisClient: any,
) => {
  const surveyName = interaction.customId.split("-").slice(1).join("-");
  const input = interaction.fields.getTextInputValue(
    `confirmDelete-${surveyName}`,
  );

  if (input == surveyName) {
    await deleteSurvey(redisClient, surveyName);
    await interaction.reply({
      content: `The survey ${surveyName} has successfully deleted!`,
      ephemeral: true,
    });
  } else {
    await interaction.reply({
      content: `Sorry, the survey name you entered does not match any existing surveys and could not be deleted. Please check the name and try again!`,
      ephemeral: true,
    });
  }
};

function convertToTimestamp(dateString: string): number {
  const dateFormat = /^\d{4}-\d{2}-\d{2}-\d{2}-\d{2}$/;

  if (!dateString.match(dateFormat)) {
    return MAX_TIMESTAMP;
  }

  const dateParts = dateString.split("-");

  const year = parseInt(dateParts[0], 10);
  const month = parseInt(dateParts[1], 10) - 1; // Month is zero-based
  const day = parseInt(dateParts[2], 10);
  const hour = parseInt(dateParts[3], 10);
  const minute = parseInt(dateParts[4], 10);

  const date = new Date(year, month, day, hour, minute);

  return date.getTime();
}
