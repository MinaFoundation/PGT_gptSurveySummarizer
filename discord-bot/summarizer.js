require('dotenv').config();
const { createClient } = require('redis');

const subscribeRedisClient = createClient({ url: process.env.REDIS_URL });
subscribeRedisClient.on('error', err => console.log('Redis Client Error', err));

const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.on('error', err => console.log('Redis Client Error', err));

// TODO look at all the last edit times vs all the last summary times for all surveys on startup, to catch any summaries that should be made since the summarizer wasn't running

(async () => {
  await subscribeRedisClient.connect();
  await redisClient.connect();

  // TODO run summarizing across all surveys once per hour (publish/ subscribe may actually not be needed at that point)

  await subscribeRedisClient.subscribe('survey-refresh', async (surveyName) => {
    // TODO actually call gpt
    console.log('create summary for', surveyName);
    await redisClient.set('survey:${surveyName}:summary', 'summary for ' + surveyName)
  });

})();
