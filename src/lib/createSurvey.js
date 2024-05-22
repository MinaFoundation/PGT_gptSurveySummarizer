export const createSurvey = async (
  redisClient,
  surveyName,
  surveyType,
  description,
  username,
) => {
  await redisClient.sAdd("surveys", surveyName);
  const initialSummaryJSON = JSON.stringify({});
  await redisClient.set(`survey:${surveyName}:summary`, initialSummaryJSON);
  await redisClient.set(`survey:${surveyName}:type`, surveyType);
  await redisClient.set(`survey:${surveyName}:title`, surveyName);
  await redisClient.set(`survey:${surveyName}:description`, description);
  await redisClient.set(`survey:${surveyName}:username`, username);
  await redisClient.set(`survey:${surveyName}:last-edit-time`, Date.now());
  await redisClient.set(`survey:${surveyName}:last-summary-time`, Date.now());
};

const respond = async (redisClient, surveyName, username, response) => {
  await redisClient.hSet(`survey:${surveyName}:responses`, username, response);
  await redisClient.set(`survey:${surveyName}:last-edit-time`, Date.now());
  await redisClient.publish("survey-refresh", surveyName);
};
