import log from "../logger.js";
import { makeSurveyPost } from "./makeSurveyPost.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { POST_CHANNEL_ID } from "@config";

export const threadPost = async (
  client,
  redisClient,
  surveyName,
  description,
  fields,
) => {
  const channelId = POST_CHANNEL_ID;
  log.info("Posting", surveyName, "to", channelId);

  const messagesToSend = await makeSurveyPost(redisClient, surveyName);
  const channel = await client.channels.fetch(channelId);

  const fieldArray = fields.split("\n").map((field, index) => {
    return { name: `Question ${index + 1}:`, value: field, inline: false };
  });

  const embed = new EmbedBuilder()
    .setColor(0x70b8ff)
    .setTitle(surveyName)
    .setDescription(description)
    .setAuthor({ name: " ", iconURL: "https://imgur.com/a/ffiT36c" })
    .addFields(...fieldArray);

  const reply = new ButtonBuilder()
    .setCustomId(`respondButton-${surveyName}`)
    .setLabel("Respond")
    .setStyle(ButtonStyle.Primary);

  await channel.threads.create({
    name: surveyName,
    message: {
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(reply)],
    },
  });
};
