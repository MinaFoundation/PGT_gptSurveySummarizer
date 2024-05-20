import "dotenv/config";
import package_json from "../package.json" with { type: "json" };

export const apikey = process.env.OPENAI_API_KEY;

export const summarizeFrequency = process.env.SUMMARIZE_FREQUENCY_SECONDS;
export const redisConfig = {
  password: process.env.REDIS_PASSWORD,
  socket: {
    host: process.env.REDIS_HOST,
    port: process.env.REDIS_PORT,
  },
};
export const discordConfig = {
  token: process.env.DISCORD_TOKEN,
  clientId: process.env.CLIENT_ID,
  guildId: process.env.GUILD_ID,
};

export const version = package_json.version;
