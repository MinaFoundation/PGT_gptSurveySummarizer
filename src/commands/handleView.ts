import { makeSurveyPost } from "@lib/index";

export const handleView = async (
  interaction: any,
  surveyName: string,
  redisClient: any,
  channelId?: string,
) => {
  try {
    const messagesToSend = await makeSurveyPost(redisClient, surveyName, false);

    if (channelId) {
      const channel = await interaction.client.channels
        .fetch(channelId)
        .catch(() => null);

      if (!channel) {
        await interaction.reply({
          content: `\`❌\` Invalid channel ID (\`${channelId}\`) or the channel is not text-based.`,
          ephemeral: true,
        });
        return;
      }

      for (const toSend of messagesToSend) {
        await channel.send(toSend);
      }

      await interaction.reply({
        content: `\`✅\` Results for survey **${surveyName}** posted to <#${channelId}>.`,
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
  } catch (error) {
    console.error("Error in handleView:", error);
    await interaction.reply({
      content: `\`❌\` There was an error viewing data for **${surveyName}**.`,
      ephemeral: true,
    });
  }
};
