export const createSurvey = async (
  redisClient,
  surveyName,
  surveyType,
  description,
  fields,
  username,
  endTime,
) => {
  await redisClient.sAdd("surveys", surveyName);
  const initialSummaryJSON = JSON.stringify({});
  await redisClient.set(`survey:${surveyName}:summary`, initialSummaryJSON);
  await redisClient.set(
    `survey:${surveyName}:executive-summary`,
    initialSummaryJSON,
  );

  await redisClient.set(`survey:${surveyName}:type`, surveyType);
  await redisClient.set(`survey:${surveyName}:title`, surveyName);
  await redisClient.set(`survey:${surveyName}:description`, description);
  await redisClient.set(`survey:${surveyName}:fields`, fields);
  await redisClient.set(`survey:${surveyName}:username`, username);
  await redisClient.set(`survey:${surveyName}:last-edit-time`, Date.now());
  await redisClient.set(`survey:${surveyName}:last-summary-time`, Date.now());
  await redisClient.set(`survey:${surveyName}:endtime`, endTime);

  if (endTime >= Date.now()) {
    await redisClient.set(`survey:${surveyName}:is-active`, "true");
  } else {
    await redisClient.set(`survey:${surveyName}:is-active`, "false");
  }
};
