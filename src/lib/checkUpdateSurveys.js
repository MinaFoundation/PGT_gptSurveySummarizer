import log from "../logger.js";
import { updateSurvey } from "./updateSurvey.js";
import { summarizeFrequency } from "../config.js";

const checkUpdateSurveys = async (redisClient) => {
  const surveys = await redisClient.sMembers("surveys");
  for (let surveyName of surveys) {
    let lastEditTime = await redisClient.get(
      `survey:${surveyName}:last-edit-time`,
    );
    let lastSummaryTime = await redisClient.get(
      `survey:${surveyName}:last-summary-time`,
    );

    lastEditTime = parseInt(lastEditTime);
    lastSummaryTime = parseInt(lastSummaryTime);

    const lastSummaryUpdateEpoch = Math.floor(
      lastSummaryTime / (summarizeFrequency * 1000),
    );
    const currentEpoch = Math.floor(Date.now() / (summarizeFrequency * 1000));

    log.debug(surveyName);
    log.debug(
      "\t",
      lastSummaryTime - lastEditTime,
      lastSummaryUpdateEpoch,
      currentEpoch,
    );

    if (lastEditTime != null) {
      if (lastSummaryTime == null) {
        await updateSurvey(redisClient, surveyName);
      } else {
        if (
          lastEditTime >= lastSummaryTime &&
          lastSummaryUpdateEpoch != currentEpoch
        ) {
          if (lastSummaryUpdateEpoch != currentEpoch) {
            await updateSurvey(redisClient, surveyName);
          }
        }
      }
    }
  }
};

export { checkUpdateSurveys };
