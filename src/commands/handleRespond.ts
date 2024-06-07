import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export const handleRespond = async (
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

  if ((await redisClient.get(`survey:${surveyName}:is-active`)) == "false") {
    await interaction.reply({
      content:
        "The survey is currently inactive, so you can't submit any answers.",
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

export const respond = async (
  redisClient: any,
  surveyName: any,
  username: any,
  response: any,
) => {
  await redisClient.hSet(`survey:${surveyName}:responses`, username, response);
  await redisClient.set(`survey:${surveyName}:last-edit-time`, Date.now());
  await redisClient.publish("survey-refresh", surveyName);
};
