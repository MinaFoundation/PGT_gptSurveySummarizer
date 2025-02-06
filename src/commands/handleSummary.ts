import log from "../logger";
import { makeSurveyPost } from "@lib/index";

export const handleSummary = async (
  interaction: any,
  surveyName: string,
  redisClient: any,
  summaryType: "yes" | "no",
  channelId?: string,
) => {
  try {
    const validStatuses = ["yes", "no"];
    if (!validStatuses.includes(summaryType)) {
      await interaction.reply({
        content: "`❌` Invalid summary type. Please choose 'yes' or 'no'.",
        ephemeral: true,
      });
      return;
    }

    let channel = null;
    if (channelId) {
      channel = await interaction.client.channels
        .fetch(channelId)
        .catch(() => null);
      if (!channel) {
        await interaction.reply({
          content: `\`❌\` Invalid channel ID (\`${channelId}\`) or the channel is not text-based.`,
          ephemeral: true,
        });
        return;
      }
    }

    if (summaryType === "yes") {
      log.debug("Summary type is high level summary.");
      const executiveSummary = await redisClient.get(
        `survey:${surveyName}:executive-summary`,
      );
      log.debug("executiveSummary:", executiveSummary);

      const summaryText = formatExecutiveSummaryForDiscord(
        executiveSummary || "",
      );

      if (channel) {
        await channel.send(summaryText);

        await interaction.reply({
          content: `\`✅\` High-level summary for **${surveyName}** posted to <#${channelId}>.`,
          ephemeral: true,
        });
      } else {
        await interaction.reply(summaryText);
      }
    } else {
      log.debug("Summary type is general summary.");
      const messagesToSend = await makeSurveyPost(
        redisClient,
        surveyName,
        true,
      );

      if (channelId) {
        for (const [i, toSend] of messagesToSend.entries()) {
          if (i === 0) {
            await channel.send(toSend);
          } else {
            await channel.send(toSend);
          }
        }
        await interaction.reply({
          content: `\`✅\` General summary for **${surveyName}** posted to <#${channelId}>.`,
          ephemeral: true,
        });
      } else {
        for (const [i, toSend] of messagesToSend.entries()) {
          if (i === 0) {
            await interaction.reply(toSend);
          } else {
            await interaction.followUp(toSend);
          }
        }
      }
    }
  } catch (error) {
    log.error("Error in handleSummary:", error);
    await interaction.reply({
      content: "`❌` There was an error generating the summary.",
      ephemeral: true,
    });
  }
};

function formatExecutiveSummaryForDiscord(summary: string): string {
  const formattedSummary = summary.trim();
  return `**Executive Summary:**\n\n${formattedSummary}`;
}
