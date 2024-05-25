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

    console.log(
      `${timeTilNextAutoPosting / 1000 / 60} minutes until the next auto-posting`,
    );
    await new Promise((r) => setTimeout(r, timeTilNextAutoPosting));

    console.log("starting auto posting");

    const autoPostSurveys = await redisClient.sMembers("auto-post-surveys");

    for (const autoPostSurvey of autoPostSurveys) {
      const channelId = autoPostSurvey.split(":")[0];
      const surveyName = autoPostSurvey.split(":").slice(1).join(":");

      console.log("posting", surveyName, "to", channelId);

      const messagesToSend = await makeSurveyPost(redisClient, surveyName);
      const channel = client.channels.cache.get(channelId);

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
