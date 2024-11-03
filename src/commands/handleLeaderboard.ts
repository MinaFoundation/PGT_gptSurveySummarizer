import { ChatInputCommandInteraction } from "discord.js";

export const handleLeaderboard = async (
  interaction: ChatInputCommandInteraction,
  redisClient: any,
) => {
  const userSurveyCounts = await redisClient.hGetAll("user:survey_counts");

  if (!userSurveyCounts || Object.keys(userSurveyCounts).length === 0) {
    await interaction.reply({content: "No data available for the leaderboard.", ephemeral: true});
    return;
  }

  const entries = Object.entries(userSurveyCounts)
    .map(([userId, countStr]) => ({
      userId,
      count: parseInt(countStr, 10),
    }))
    .filter(entry => entry.count > 0);

  if (entries.length === 0) {
    await interaction.reply({content: "No users have responded to surveys yet.", ephemeral: true});
    return;
  }

  entries.sort((a, b) => b.count - a.count);

  const topEntries = entries.slice(0, 10);

  const trophyEmojis = ["🥇", "🥈", "🥉"];
  const currentDate = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });

  let leaderboardMessage = `🏆 **Leaderboard | ${currentDate}** 🏆\n\n`;

  for (const [index, entry] of topEntries.entries()) {
    const rank = index + 1;
    const userId = entry.userId;
    const contributions = entry.count;

    const rankStr = rank <= trophyEmojis.length ? trophyEmojis[rank - 1] : `${rank}.`;

    let member = interaction.guild.members.cache.get(userId);
    if (!member) {
      try {
        member = await interaction.guild.members.fetch(userId);
      } catch (error) {
        console.error(`Failed to fetch member with ID ${userId}:`, error);
      }
    }

    const memberName = member ? member.displayName : `(${userId})`;
    const userMention = member ? `<@${member.id}>` : `(${userId})`;

    leaderboardMessage += `${rankStr} **${memberName}** ${userMention} **|** ${contributions} responds\n`;
  }

  if (leaderboardMessage.length > 2000) {
    const messages = splitMessage(leaderboardMessage);
    await interaction.reply(messages[0]);
    for (let i = 1; i < messages.length; i++) {
      await interaction.followUp(messages[i]);
    }
  } else {
    await interaction.reply(leaderboardMessage);
  }
};

function splitMessage(message: string, maxLength = 2000): string[] {
  const messages = [];
  let currentMessage = '';

  const lines = message.split('\n');
  for (const line of lines) {
    if ((currentMessage + line + '\n').length > maxLength) {
      messages.push(currentMessage);
      currentMessage = line + '\n';
    } else {
      currentMessage += line + '\n';
    }
  }
  if (currentMessage) {
    messages.push(currentMessage);
  }
  return messages;
}
