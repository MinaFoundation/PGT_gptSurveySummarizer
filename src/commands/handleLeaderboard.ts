import { ChatInputCommandInteraction } from "discord.js";

export const handleLeaderboard = async (
  interaction: ChatInputCommandInteraction,
  redisClient: any,
) => {
  const userSurveyCounts = await redisClient.hGetAll("user:survey_counts");

  if (!userSurveyCounts || Object.keys(userSurveyCounts).length === 0) {
    await interaction.reply({
      content: "No data available for the leaderboard.",
      ephemeral: true,
    });
    return;
  }

  const entries = Object.entries(userSurveyCounts)
    .map(([username, countStr]) => ({
      username,
      count: parseInt(countStr, 10),
    }))
    .filter((entry) => entry.count > 0);

  if (entries.length === 0) {
    await interaction.reply({
      content: "No users have responded to surveys yet.",
      ephemeral: true,
    });
    return;
  }

  entries.sort((a, b) => b.count - a.count);

  const topEntries = entries.slice(0, 10);

  const trophyEmojis = ["🥇", "🥈", "🥉"];
  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  let leaderboardMessage = `🏆 **Leaderboard | ${currentDate}** 🏆\n\n`;

  for (const [index, entry] of topEntries.entries()) {
    const rank = index + 1;
    const username = entry.username;
    const contributions = entry.count;

    const rankStr =
      rank <= trophyEmojis.length ? trophyEmojis[rank - 1] : `${rank}.`;

    let member = interaction.guild.members.cache.find(
      (m) => m.user.username === username,
    );

    const userDisplayName = member ? `<@${member.user.id}>` : username;

    leaderboardMessage += `${rankStr} **${userDisplayName}** **|** ${contributions*10} Points\n`;
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
  let currentMessage = "";

  const lines = message.split("\n");
  for (const line of lines) {
    if ((currentMessage + line + "\n").length > maxLength) {
      messages.push(currentMessage);
      currentMessage = line + "\n";
    } else {
      currentMessage += line + "\n";
    }
  }
  if (currentMessage) {
    messages.push(currentMessage);
  }
  return messages;
}
