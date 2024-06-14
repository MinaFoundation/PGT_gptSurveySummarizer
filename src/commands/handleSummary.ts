import log from "../logger";
import { makeSurveyPost } from "@lib/index";

export const handleSummary = async (
  interaction: any,
  surveyName: any,
  redisClient: any,
  summaryType: any
) => {
    try {
        const validStatuses = ["yes", "no"];
        if (!validStatuses.includes(summaryType)) {
            await interaction.reply({
            content: "Invalid summary type. Please choose 'yes' or 'no'.",
            ephemeral: true,
            });
            return;
        }

        } catch (error) {
        log.error("Error setting summary type:", error);
        await interaction.reply({
            content: "There was an error setting the summary type.",
            ephemeral: true,
        });
    }
  const messagesToSend = await makeSurveyPost(redisClient, surveyName);
  for (const [i, toSend] of messagesToSend.entries()) {
    if (i === 0) {
      await interaction.reply(toSend);
    } else {
      await interaction.followUp(toSend);
    }
  }
};
