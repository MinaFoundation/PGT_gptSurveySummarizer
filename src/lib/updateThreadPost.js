import log from "../logger.js";
import { makeSurveyPost } from "./makeSurveyPost.js";
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { EmbedBuilder } from "discord.js";
import { discordConfig, POST_CHANNEL_ID } from "@config";

export const updateThreadPost = async (
  interaction,
  client,
  redisClient,
  surveyName,
  updatedSurveyName,
  description,
  fields,
) => {
  const channelId = POST_CHANNEL_ID;
  log.info("Updating", surveyName, "to", channelId);

  const messagesToSend = await makeSurveyPost(redisClient, surveyName);
  const channel = await client.channels.fetch(channelId);

  const guild = client.guilds.cache.get(discordConfig.guildId);
  const threads = guild.channels.cache.filter((x) => x.isThread());
  const thread = threads.find((info) => info.name == surveyName);
  console.log(thread);

  const threadMessage = await thread.fetchStarterMessage();

  const fieldArray = fields.split("\n").map((field, index) => {
    return { name: `Question ${index + 1}:`, value: field, inline: false };
  });

  const embed = new EmbedBuilder()
    .setColor(0x70b8ff)
    .setTitle(updatedSurveyName)
    .setDescription(description)
    .setAuthor({ name: "Survey Bot", iconURL: "https://imgur.com/a/ffiT36c" })
    .addFields(...fieldArray);

  const reply = new ButtonBuilder()
    .setCustomId(`respondButton-${updatedSurveyName}`)
    .setLabel("Respond")
    .setStyle(ButtonStyle.Primary);

  if (thread) {
    await thread.setName(updatedSurveyName);
    await threadMessage.edit({
      embeds: [embed],
      components: [new ActionRowBuilder().addComponents(reply)],
    });
    log.info("Thread updated successfully.");
  } else {
    log.error("Starter message not found in the thread!");
  }
};
