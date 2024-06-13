import log from "../logger.js";
import { discordConfig } from "@config";

export const deleteThreadPost = async (
  client,
  surveyName,
) => {
  log.info("Deleting", surveyName);

  const guild = client.guilds.cache.get(discordConfig.guildId);
  const threads = guild.channels.cache.filter(x => x.isThread());
  const thread = threads.find(info => info.name == surveyName)
  
  console.log(thread)

  if (thread) {
    await thread.delete(surveyName);
    log.info("Thread deleted successfully.");
  } else {
    log.error("Starter message not found in the thread!");
  }
};
