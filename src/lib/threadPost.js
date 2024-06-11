import log from '../logger.js'
import { makeSurveyPost } from "./makeSurveyPost.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { POST_CHANNEL_ID } from '@config';

export const threadPost = async (
  client,
  redisClient,
  surveyName,
  description,
) => {
  const channelId = POST_CHANNEL_ID;
  log.info("Posting", surveyName, "to", channelId);

  const messagesToSend = await makeSurveyPost(redisClient, surveyName);
  const channel = await client.channels.fetch(channelId);

  const reply = new ButtonBuilder()
    .setCustomId(`respondButton-${surveyName}`)
    .setLabel("Respond")
    .setStyle(ButtonStyle.Primary);

  await channel.threads.create({
    name: surveyName,
    message: {
      content: description,
      components: [new ActionRowBuilder().addComponents(reply)],
    },
  });
};
