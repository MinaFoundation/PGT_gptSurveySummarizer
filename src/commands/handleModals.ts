import { createSurvey } from "../lib/createSurvey.js";
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
  if (await redisClient.sIsMember("surveys", surveyName)) {
    await interaction.reply({
      content: "A survey with that name already exists",
      ephemeral: true,
    });
  } else {
    await createSurvey(redisClient, title, surveyType, description, username);
    await interaction.reply({
      content: "Your Survey was created successfully!",
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
    const responses = new Array(maxResponsesForMultiResponsePerUser)
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
