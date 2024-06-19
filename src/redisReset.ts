import log from "./logger.js";
import { createClient } from "redis";
import { redisConfig } from "./config";

async function clearRedisDatabase() {
  const client = createClient(redisConfig);

  client.on("error", (err) => {
    log.error("Redis Client Error", err);
  });

  await client.connect();

  try {
    await client.flushAll();
    log.debug("All keys and values have been deleted from the Redis database.");
  } catch (err) {
    log.error("Error while clearing the Redis database:", err);
  } finally {
    await client.disconnect();
  }
}

clearRedisDatabase();
