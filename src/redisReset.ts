import { createClient } from "redis";
import { redisConfig } from "./config";

async function clearRedisDatabase() {
  const client = createClient(redisConfig);

  client.on("error", (err) => {
    console.error("Redis Client Error", err);
  });

  await client.connect();

  try {
    await client.flushAll();
    console.log(
      "All keys and values have been deleted from the Redis database.",
    );
  } catch (err) {
    console.error("Error while clearing the Redis database:", err);
  } finally {
    await client.disconnect();
  }
}

clearRedisDatabase();
