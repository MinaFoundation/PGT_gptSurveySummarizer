import { createClient } from "redis";
import { checkUpdateSurveys } from "./lib/checkUpdateSurveys.js";
import { redisConfig } from "./config.js";

const subscribeRedisClient = createClient(redisConfig);
subscribeRedisClient.on("error", (err) =>
  console.log("Redis Client Error", err),
);

const redisClient = createClient(redisConfig);
redisClient.on("error", (err) => console.log("Redis Client Error", err));

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Unhandled exception:", error);
});

// ==========================================================================================

const main = async () => {
  await subscribeRedisClient.connect();
  await redisClient.connect();

  while (true) {
    console.log("checking surveys for updates...");
    try {
      await checkUpdateSurveys(redisClient);
    } catch (e) {
      console.error("error while processing surveys:", e);
    }
    console.log("done checking surveys for updates.");
    await new Promise((r) => setTimeout(r, 1 * 1000));
  }

  // NOTE this updates every time a new response shows up; disabled for now
  //await subscribeRedisClient.subscribe('survey-refresh', async (surveyName) => {
  //  updateSurvey(surveyName);
  //});
};

// ==========================================================================================

// ==========================================================================================

function filterEmptySubtopics(taxonomy) {
  return taxonomy.map((t) => {
    t.subtopics = t.subtopics.filter((s) => {
      return s.responses != null && s.responses.length > 0;
    });
    return t;
  });
}

function filterEmptyTopics(taxonomy) {
  return taxonomy.filter((t) => {
    return t.subtopics.length > 0;
  });
}

main();
