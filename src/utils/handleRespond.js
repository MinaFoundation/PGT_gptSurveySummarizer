import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export const handleRespond = async (redisClient, interaction, surveyName) => {
  if (!(await redisClient.sIsMember("surveys", surveyName))) {
    await interaction.reply({
      content: "There is no survey with that name",
      ephemeral: true,
    });
    return;
  }

  const surveyDescription = await redisClient.get(
    `survey:${surveyName}:description`,
  );
  const msg = `### Survey: ${surveyName}\n> ${surveyDescription}`;

  const reply = new ButtonBuilder()
    .setCustomId(`respondButton-${surveyName}`)
    .setLabel("Respond")
    .setStyle(ButtonStyle.Primary);

  await interaction.reply({
    content: msg,
    components: [new ActionRowBuilder().addComponents(reply)],
  });
};
