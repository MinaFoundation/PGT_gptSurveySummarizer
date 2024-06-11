import log from "./logger.js";
import { createClient } from "redis";
import { checkUpdateSurveys } from "./lib/checkUpdateSurveys.js";
import { redisConfig } from "./config.js";

const subscribeRedisClient = createClient(redisConfig);
subscribeRedisClient.on("error", (err) =>
  log.error("Redis Client Error", err),
);

const redisClient = createClient(redisConfig);
redisClient.on("error", (err) => log.error("Redis Client Error", err));

process.on("unhandledRejection", (error) => {
  log.error("Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
  log.error("Unhandled exception:", error);
});

const main = async () => {
  await subscribeRedisClient.connect();
  await redisClient.connect();

  while (true) {
    log.info("checking surveys for updates...");
    try {
      await checkUpdateSurveys(redisClient);
    } catch (e) {
      log.error("error while processing surveys:", e);
    }
    log.info("done checking surveys for updates.");
    await new Promise((r) => setTimeout(r, 1 * 1000));
  }

  // NOTE this updates every time a new response shows up; disabled for now
  //await subscribeRedisClient.subscribe('survey-refresh', async (surveyName) => {
  //  updateSurvey(surveyName);
  //});
};

main();
