// handleAutoPost.js
import { ChatInputCommandInteraction, Client } from "discord.js";

export const handleAutoPost = async (
  interaction: any,
  action: string,
  client: any,
  redisClient: any,
  surveyName: string,
  channelId: any,
) => {
  if (!channelId) {
    const channel = client.channels.cache.get(interaction.channelId);
    const key = "auto-post-surveys";

    const method = action === "start" ? "sAdd" : "sRem";

    await redisClient[method](key, `${channel}:${surveyName}`);

    await interaction.reply({
      content: `Survey **${surveyName}** will ${action === "start" ? "start" : "stop"} being auto-posted in this channel`,
      ephemeral: true,
    });

    return;
  }

  const channel = client.channels.cache.get(channelId);

  const key = "auto-post-surveys";

  const method = action === "start" ? "sAdd" : "sRem";

  await redisClient[method](key, `${channel}:${surveyName}`);

  await interaction.reply({
    content: `Survey **${surveyName}** will ${action === "start" ? "start" : "stop"} being auto-posted in channel: ${channelId}`,
    ephemeral: true,
  });
};
