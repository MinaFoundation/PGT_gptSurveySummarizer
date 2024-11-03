import { ChatInputCommandInteraction } from "discord.js";

export const handleLeaderboard = async (
  interaction: ChatInputCommandInteraction,
  redisClient: any,
) => {
  await interaction.reply({
    content: `Leaderboard!`,
    ephemeral: false,
  });
};
