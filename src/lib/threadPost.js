import { makeSurveyPost } from "./makeSurveyPost.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export const threadPost = async (
  client,
  redisClient,
  surveyName,
  description,
) => {
  const channelId = "1245319554201157724";
  console.log("posting", surveyName, "to", channelId);

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
