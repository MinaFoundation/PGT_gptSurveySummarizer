import { isMeaningful } from "@lib/isMeaningful";
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

  if ((await redisClient.get(`survey:${surveyName}:type`)) == "proposal") {
    await interaction.reply({
      content:
        "The survey is actually a proposal in Govbot. You cannot respond it in discord.",
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

const evaluateResponseMeaningfulness = async (
  response: string,
): Promise<boolean> => {
  const res = await isMeaningful(response);
  return res;
};

export const respond = async (
  redisClient: any,
  surveyName: any,
  username: any,
  response: any,
) => {
  const hasResponded = await redisClient.hExists(
    `survey:${surveyName}:responses`,
    username,
  );

  await redisClient.hSet(`survey:${surveyName}:responses`, username, response);
  await redisClient.set(`survey:${surveyName}:last-edit-time`, Date.now());
  await redisClient.publish("survey-refresh", surveyName);

  const isMeaningful = await evaluateResponseMeaningfulness(response);

  const surveyCreatedAt = await redisClient.get(
    `survey:${surveyName}:created-at`,
  );
  const surveyCreatedTimestamp = Number(surveyCreatedAt);
  const responseTimestamp = Date.now();

  const ONE_DAY_MS = 24 * 60 * 60 * 1000; // 24 hours
  const ONE_WEEK_MS = 7 * ONE_DAY_MS; // 7 days

  const timeElapsed = responseTimestamp - surveyCreatedTimestamp;

  let points = 0;
  if (isMeaningful) {
    if (timeElapsed <= ONE_DAY_MS) {
      points = 10;
    } else if (timeElapsed <= ONE_WEEK_MS) {
      points = 5;
    } else {
      points = 1;
    }
  }

  if (!hasResponded && isMeaningful) {
    await redisClient.hIncrBy("user:survey_counts", username, 1);
    await redisClient.hIncrBy("user:survey_counts_discord", username, 1);
    await redisClient.hIncrBy("user:survey_points", username, points);
  }
};
