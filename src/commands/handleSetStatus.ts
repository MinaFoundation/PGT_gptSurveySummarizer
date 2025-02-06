import log from "../logger";
import { ChatInputCommandInteraction } from "discord.js";

export const handleSetStatus = async (
  interaction: any,
  surveyName: any,
  status: string,
  redisClient: any,
) => {
  try {
    const validStatuses = ["activate", "deactivate"];
    if (!validStatuses.includes(status)) {
      await interaction.reply({
        content: "Invalid status. Please choose 'activate' or 'deactivate'.",
        ephemeral: true,
      });
      return;
    }

    await redisClient.set(
      `survey:${surveyName}:is-active`,
      status === "activate" ? "true" : "false",
    );

    log.info(`Survey "${surveyName}" status has been set to ${status}.`);

    await interaction.reply({
      content: `Survey "${surveyName}" status has been set to ${status}.`,
      ephemeral: true,
    });
  } catch (error) {
    log.error("Error setting survey status:", error);
    await interaction.reply({
      content: "There was an error setting the survey status.",
      ephemeral: true,
    });
  }
};
