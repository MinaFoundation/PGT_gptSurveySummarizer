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

  let thread;
  let threadMessage;

  try {
    const guild = await client.guilds.fetch(discordConfig.guildId);
    const channel = await guild.channels.fetch(POST_CHANNEL_ID);
    const threads = await channel.threads.fetch({force: true})
    thread = threads.threads.find(channel => channel.name === surveyName);

    if (thread) {
      threadMessage = await thread.fetchStarterMessage({force: true});
      console.log(threadMessage)
    } else {
      log.debug('Thread not found');
    }
  } catch (error) {
    log.error('Error fetching thread:', error);
  }

  const fieldArray = fields.split("\n").map((field, index) => {
    return { name: `Question ${index + 1}:`, value: field, inline: false };
  });

  const embed = new EmbedBuilder()
    .setColor(0x70b8ff)
    .setTitle(updatedSurveyName)
    .setDescription(description)
    .setAuthor({ name: " ", iconURL: "https://imgur.com/a/ffiT36c" })
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
    log.info(
      "Starter message not found in the thread! or the survey is not in the forum",
    );
  }
};
