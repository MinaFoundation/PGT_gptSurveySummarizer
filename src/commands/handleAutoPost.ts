import { ChatInputCommandInteraction, Client } from "discord.js";

export const handleAutoPost = async (
  interaction: ChatInputCommandInteraction,
  action: string,
  client: Client,
  redisClient: any,
) => {
  const channel = client.channels.cache.get(interaction.channelId);
  const surveyName = interaction.options.getString("survey");
  const key = "auto-post-surveys";
  const method = action === "start" ? "sAdd" : "sRem";
  await redisClient[method](key, `${channel}:${surveyName}`);
  await interaction.reply({
    content: `Your survey will ${action === "start" ? "start" : "stop"} being auto-posted`,
    ephemeral: true,
  });
};
