import log from "../logger.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { EmbedBuilder } from "discord.js";

export const postSurvey = async (
  client,
  redisClient,
  surveyName,
  channelId,
) => {
  log.info("Posting", surveyName, "to", channelId);

  const title = await redisClient.get(`survey:${surveyName}:title`);
  const description = await redisClient.get(`survey:${surveyName}:description`);
  const fields = await redisClient.get(`survey:${surveyName}:fields`);

  if (!title || !description || !fields) {
    log.error(
      `Survey data for ${surveyName} is incomplete or missing in Redis`,
    );
    return;
  }

  const fieldArray = fields.split("\n").map((field, index) => {
    return { name: `Question ${index + 1}:`, value: field, inline: false };
  });

  const embed = new EmbedBuilder()
    .setColor(0x70b8ff)
    .setTitle(title)
    .setDescription(description)
    .setAuthor({ name: " ", iconURL: "https://imgur.com/a/ffiT36c" })
    .addFields(...fieldArray);

  const reply = new ButtonBuilder()
    .setCustomId(`respondButton-${surveyName}`)
    .setLabel("Respond")
    .setStyle(ButtonStyle.Primary);

  const channel = await client.channels.fetch(channelId);

  await channel.threads.create({
    name: surveyName,
    message: {
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(reply)],
    },
  });

  log.info(`Survey ${surveyName} posted successfully.`);
};
