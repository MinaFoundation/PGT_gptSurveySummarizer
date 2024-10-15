import log from "../logger.js";

import { summarizeFrequency } from "../config.js";
import { makeSurveyPost } from "./makeSurveyPost.js";

export const startAutoPosting = async (client, redisClient) => {
  while (true) {
    const timeSinceLastUpdate = Date.now() % (summarizeFrequency * 1000);
    const timeOfLastUpdate = Date.now() - timeSinceLastUpdate;
    const timeOfNextUpdate = timeOfLastUpdate + summarizeFrequency * 1000;
    const fiveMinutes = 5 * 60 * 1000;
    const timeOfNextAutoPosting = timeOfNextUpdate + fiveMinutes;
    const timeTilNextAutoPosting = timeOfNextAutoPosting - Date.now();

    log.info(
      `${timeTilNextAutoPosting / 1000 / 60} minutes until the next auto-posting`,
    );
    await new Promise((r) => setTimeout(r, timeTilNextAutoPosting));

    log.info("Starting auto posting");

    const autoPostSurveys = await redisClient.sMembers("auto-post-surveys");

    for (const autoPostSurvey of autoPostSurveys) {
      const parts = autoPostSurvey.split(":");
      const channelIdWithBrackets = parts[0];
      const channelId = channelIdWithBrackets.slice(2, -1);
      const surveyName = parts.slice(1).join(":");

      log.info("Posting", surveyName, "to", channelId);

      const messagesToSend = await makeSurveyPost(
        redisClient,
        surveyName,
        true,
      );

      let channel;

      try {
        channel = await client.channels.fetch(channelId);
      } catch (error) {
        log.error(`Channel ${channelId} cannot found`);
        continue;
      }

      const surveyPrefixes = [
        '# :ballot_box:',
        ':page_facing_up:',
        ':thought_balloon:',
        ':speech_balloon:',
        '## :new:',
        ':timer:',
        ':green_circle:',
        // Number Emojis
        ':zero:',
        ':one:',
        ':two:',
        ':three:',
        ':four:',
        ':five:',
        ':six:',
        ':seven:',
        ':eight:',
        ':nine:',
        // Letter Emojis
        ':regional_indicator_a:',
        ':regional_indicator_b:',
        ':regional_indicator_c:',
        ':regional_indicator_d:',
        ':regional_indicator_e:',
        ':regional_indicator_f:',
        ':regional_indicator_g:',
        ':regional_indicator_h:',
        ':regional_indicator_i:',
        ':regional_indicator_j:',
        '▬▬▬▬'
      ];
      

      try {
        if (channel.isThread()) {
<<<<<<< Updated upstream
          const messages = await channel.messages.fetch();

          const surveyMessage = messages.find((msg) =>
            surveyPrefixes.some((prefix) => msg.content.startsWith(prefix))
          );

          if (surveyMessage) {
            await surveyMessage.delete();
            log.debug(`Deleted survey message: ${surveyMessage.id}`);
          } else {
            log.debug(`No survey message found with the specified prefixes.`);
=======
          const botUserId = client.user?.id;
          if (!botUserId) {
            throw new Error("Bot user ID not available.");
          }
      
          const threadStarterMessage = await channel.fetchStarterMessage();
          const starterMessageId = threadStarterMessage?.id;
      
          const messages = await channel.messages.fetch({ limit: 1000 });
      
          const botMessages = messages.filter((msg) => 
            msg.author.id === botUserId && msg.id !== starterMessageId
          );
      
          if (botMessages.size > 0) {
            for (const [messageId, message] of botMessages) {
              await message.delete();
              log.debug(`Deleted bot message: ${messageId}`);
            }
          } else {
            log.debug(`No bot messages found in the thread.`);
>>>>>>> Stashed changes
          }
        }
      } catch (error) {
        log.error(`Error deleting bot messages: ${error.message}`);
      }
      
      

      for (const [i, toSend] of Object.entries(messagesToSend)) {
        if (i == 0) {
          await channel.send(toSend);
        } else {
          await channel.send(toSend);
        }
      }
    }
  }
};
