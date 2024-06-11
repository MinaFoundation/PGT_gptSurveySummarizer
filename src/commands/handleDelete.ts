import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export const handleDelete = async (
  redisClient: any,
  interaction: any,
  surveyName: any,
) => {
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
    .setCustomId(`deleteButton-${surveyName}`)
    .setLabel("Delete")
    .setStyle(ButtonStyle.Primary);

  await interaction.reply({
    content: msg,
    components: [new ActionRowBuilder().addComponents(reply)],
  });
};

export const deleteSurvey = async (redisClient: any, surveyName: any) => {
  await redisClient.sRem("surveys", surveyName);

  await redisClient.del(`survey:${surveyName}:summary`);
  await redisClient.del(`survey:${surveyName}:type`);
  await redisClient.del(`survey:${surveyName}:title`);
  await redisClient.del(`survey:${surveyName}:description`);
  // Add this when branch changed to multiple respons thing:
  // await redisClient.set(`survey:${surveyName}:fields`);
  await redisClient.del(`survey:${surveyName}:username`);
  await redisClient.del(`survey:${surveyName}:last-edit-time`);
  await redisClient.del(`survey:${surveyName}:last-summary-time`);
};
