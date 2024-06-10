import package_json from "../package.json" with { type: "json" };
import dotenv from "dotenv";

dotenv.config({ path: `.env.local`, override: true });

export const apikey = process.env.OPENAI_API_KEY;
export const summarizeFrequency = process.env.SUMMARIZE_FREQUENCY_SECONDS;
export const redisConfig = {
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
  tls: true,
};

export const discordConfig = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
};

export const version = package_json.version;

export const POST_CHANNEL_ID = "1245319554201157724"
