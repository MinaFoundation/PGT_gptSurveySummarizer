import { makeSurveyPost } from "@lib/index";

export const handleView = async (
  interaction: any,
  surveyName: any,
  redisClient: any,
) => {
  const messagesToSend = await makeSurveyPost(redisClient, surveyName);
  for (const [i, toSend] of messagesToSend.entries()) {
    if (i === 0) {
      await interaction.reply(toSend);
    } else {
      await interaction.followUp(toSend);
    }
  }
};
