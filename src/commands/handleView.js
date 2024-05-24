import { makeSurveyPost } from "../lib/makeSurveyPost.js";

export const handleView = async (interaction, surveyName, redisClient) => {
  const messagesToSend = await makeSurveyPost(redisClient, surveyName);
  for (const [i, toSend] of messagesToSend.entries()) {
    if (i === 0) {
      await interaction.reply(toSend);
    } else {
      await interaction.followUp(toSend);
    }
  }
};
