import package_json from "../package.json" with { type: "json" };
import log from "./logger.js";
import dotenv from "dotenv";

dotenv.config({ path: `.env.local`, override: true });

export const apikey = process.env.OPENAI_API_KEY;
export const summarizeFrequency = process.env.SUMMARIZE_FREQUENCY_SECONDS;
export const redisConfig = {
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
    reconnectStrategy: function (retries) {
      if (retries >= 20) {
        log.error("Unable to reconnect to Redis reconnectStrategy");
        process.exit(1);
      }
      return Math.max(retries * 500, 4000);
    },
    connectTimeout: 10000,
    keepAlive: true,
    keepAliveInterval: 5000,
  },
  tls: true,
};

export const discordConfig = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
  adminChannelId: process.env.GSS_BOT_ADMIN_CHANNEL_ID,
};

export const version = package_json.version;

export const POST_CHANNEL_ID = process.env.POST_CHANNEL_ID
  ? process.env.POST_CHANNEL_ID.toString()
  : "";
export const GSS_LOG_LEVEL = process.env.GSS_LOG_LEVEL || "INFO";

export const AUTH_SECRET = process.env.AUTH_SECRET || "";

export const ADMIN_CHANNEL_ID = process.env.GSS_BOT_ADMIN_CHANNEL_ID || "";
