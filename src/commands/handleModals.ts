import log from "../logger";
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
  const isThreadPost =
    interaction.fields.getTextInputValue("setThreadPostInput");

  let isTp = isThreadPost == "true" ? true : false;

  if (!checkTitle(title)) {
    log.warn("Title includes -, it is not verified");
    await interaction.reply({
      content: `Survey name cannot include "-"`,
      ephemeral: true,
    });
    return;
  }

  if (!verifyFields(fields)) {
    log.warn("Fields input is not verified");
    await interaction.reply({
      content: "Each question must be at most 45 characters long.",
      ephemeral: true,
    });
    return;
  }

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
    return [title, description, fields, isTp];
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
  const isThreadPost =
    interaction.fields.getTextInputValue("setThreadPostInput");

  let isTp = Boolean(isThreadPost === "true");

  if (!checkTitle(title)) {
    log.warn("Title includes -, it is not verified");
    await interaction.reply({
      content: `Survey name cannot include "-"`,
      ephemeral: true,
    });
    return;
  }

  if (!verifyFields(fields)) {
    log.warn("Fields input is not verified");
    await interaction.reply({
      content: "Each question must be at most 45 characters long.",
      ephemeral: true,
    });
    return;
  }

  if (!(endTime == "inf" || endTime == "" || endTime == "INF")) {
    endTime = convertToTimestamp(endTime);
  } else {
    endTime = MAX_TIMESTAMP;
  }

  if (!(await redisClient.sIsMember("surveys", surveyName))) {
    log.debug(surveyName);
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

  if (endTime !== parseInt(surveyEndTime)) {
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
    return [
      surveyName,
      updatedTitle,
      updatedDescription,
      updatedFields,
      isTp,
      true,
    ];
  } else {
    await interaction.reply({
      content: "No changes were made as the input values were the same.",
      ephemeral: true,
    });
    return [surveyName, title, description, fields, isTp, false];
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

  if ((await redisClient.get(`survey:${surveyName}:is-active`)) == "false") {
    await interaction.reply({
      content:
        "The survey is currently inactive, so you can't submit any answers.",
      ephemeral: true,
    });
    return;
  }

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
    return [true, surveyName];
  } else {
    await interaction.reply({
      content: `Sorry, the survey name you entered does not match any existing surveys and could not be deleted. Please check the name and try again!`,
      ephemeral: true,
    });
  }
};

export const handleEditSurveyCountModal = async (
  interaction: any,
  username: any,
  redisClient: any,
) => {
  const usernameInput = interaction.fields.getTextInputValue(`usernameInput`);
  const countInput = interaction.fields.getTextInputValue(`countInput`);
  const pointsInput = interaction.fields.getTextInputValue(`pointsInput`);

  const adjustment = parseInt(countInput, 10);
  const pointsAdjustment = parseInt(pointsInput, 10);

  if (isNaN(adjustment) || isNaN(pointsAdjustment)) {
    await interaction.reply({
      content:
        "Invalid count or points input. Please use a format like '+3' or '-2' or '+10' or '-5'.",
      ephemeral: true,
    });
    return;
  }

  await redisClient.hIncrBy("user:survey_counts", usernameInput, adjustment);
  await redisClient.hIncrBy(
    "user:survey_points",
    usernameInput,
    pointsAdjustment,
  );

  const updatedCount = await redisClient.hGet(
    "user:survey_counts",
    usernameInput,
  );

  await interaction.reply({
    content: `Survey count for ${usernameInput} has been updated. New count: ${updatedCount}`,
    ephemeral: true,
  });
};

export function convertToTimestamp(dateString: string): number {
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

  if (
    month < 0 ||
    month > 11 ||
    day < 1 ||
    day > 31 ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    return MAX_TIMESTAMP;
  }

  const date = new Date(year, month, day, hour, minute);

  return date.getTime();
}

export function verifyFields(fields: string): boolean {
  const lines = fields.split("\n");
  for (const line of lines) {
    if (line.length > 45) {
      return false;
    }
  }
  return true;
}

function checkTitle(input: string): boolean {
  if (input.includes("-")) {
    return false;
  }
  return true;
}
