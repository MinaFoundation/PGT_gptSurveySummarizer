require('dotenv').config();
const { createClient } = require('redis');

const subscribeRedisClient = createClient({ url: process.env.REDIS_URL });
subscribeRedisClient.on('error', err => console.log('Redis Client Error', err));

const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.on('error', err => console.log('Redis Client Error', err));

(async () => {
  await subscribeRedisClient.connect();
  await redisClient.connect();

  await subscribeRedisClient.subscribe('survey-refresh', async (surveyName) => {
    // TODO actually call gpt
    console.log('create summary for', surveyName);
    await redisClient.set('survey:${surveyName}:summary', 'summary for ' + surveyName)
  });

})();
