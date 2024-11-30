import { ChatInputCommandInteraction, GuildMember } from "discord.js";

export const handleLeaderboard = async (
  interaction: ChatInputCommandInteraction,
  redisClient: any,
) => {
  const userSurveyPoints = await redisClient.hGetAll("user:survey_points");

  if (!userSurveyPoints || Object.keys(userSurveyPoints).length === 0) {
    await interaction.reply({
      content: "No data available for the leaderboard.",
      ephemeral: true,
    });
    return;
  }

  const entries = Object.entries(userSurveyPoints)
    .map(([username, pointsStr]) => ({
      username,
      points: parseInt(pointsStr, 10),
    }))
    .filter((entry) => entry.points > 0);

  if (entries.length === 0) {
    await interaction.reply({
      content: "No users have earned survey points yet.",
      ephemeral: true,
    });
    return;
  }

  entries.sort((a, b) => b.points - a.points);

  const topEntries = entries;

  const trophyEmojis = ["🥇", "🥈", "🥉"];
  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  let leaderboardMessage = `🏆 **Survey Leaderboard | ${currentDate}** 🏆\n\n`;

  const members = interaction.guild?.members.cache;

  if (members) {
    const memberList = members.map((member: GuildMember) => ({
      [member.user.username]: member.user.id,
    }));
  }

  for (const [index, entry] of topEntries.entries()) {
    const rank = index + 1;
    const username = entry.username;
    const points = entry.points;

    const rankStr =
      rank <= trophyEmojis.length ? trophyEmojis[rank - 1] : `${rank}.`;

    const member = members.find(
      (m: GuildMember) =>
        m.user.username === username || m.user.globalName === username,
    );

    const userDisplayName = member ? `<@${member.user.id}>` : username;

    leaderboardMessage += `${rankStr} **${userDisplayName}** **|** ${points} Points\n`;
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
