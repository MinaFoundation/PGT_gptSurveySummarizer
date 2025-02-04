import { createClient } from "redis";
import log from "../logger"; // Adjust path as necessary
import { redisConfig } from "@config"; // Adjust path as necessary

const redisClient = createClient(redisConfig);

redisClient.on("error", (err) => {
  log.error("Redis Client Error:", err);
});

(async () => {
  try {
    await redisClient.connect();
    log.info("Connected to Redis server");
  } catch (error) {
    log.error("Failed to connect to Redis server:", error);
  }
})();

export default redisClient;
