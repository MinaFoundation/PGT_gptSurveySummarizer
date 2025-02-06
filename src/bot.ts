import log from "./logger";

import { setIntervalAsync } from "set-interval-async/dynamic";
import { startAutoPosting } from "./lib/startAutoPosting.js";

import {
  maxResponsesForMultiResponsePerUser,
  create_multi_cmd,
  EXPIRE_STATUS_LOOP_MINUTE,
} from "@constants";

import { discordConfig, redisConfig, version } from "@config";
import { createClient } from "redis";
import { Client, GatewayIntentBits, PermissionsBitField } from "discord.js";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { threadPost } from "@lib/threadPost.js";
import { updateThreadPost } from "@lib/updateThreadPost";
import { deleteThreadPost } from "./lib";
import {
  checkAndUpdateSurveyStatus,
  cleanUpAdminChannel,
  handleInteraction,
  setupAdminChannel,
} from "./adminUtils";
import { command } from "@commands/commandBuilder";

process.on("unhandledRejection", (error) => {
  log.error("Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
  log.error("Unhandled exception:", error);
});

(async () => {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  const redisClient = createClient(redisConfig);

  redisClient.on("error", (err) => log.error("Redis Client Error", err));

  await redisClient.connect();
  redisClient.on("connect", () => log.info("Connected to Redis server"));

  const rest = new REST({ version: "10" }).setToken(discordConfig.token);

  try {
    await rest.put(
      Routes.applicationGuildCommands(
        discordConfig.clientId,
        discordConfig.guildId,
      ),
      { body: [command.toJSON()] },
    );
    log.info("Successfully registered the bot.");
  } catch (error) {
    log.error("Error registering bot", error);
  }

  const adminChannelId = discordConfig.adminChannelId;
  let adminChannel;

  client.once("ready", async () => {
    log.info("Ready as ", client.user.username);
    startAutoPosting(client, redisClient);
    startSurveyStatusChecker(redisClient);

    try {
      adminChannel = await client.channels.fetch(adminChannelId);
    } catch (err) {
      log.error("Error fetching admin channel:", err);
    }

    if (!adminChannel) {
      log.error(
        "Admin channel not found. Please ensure the adminChannelId is correct.",
      );
      return;
    }

    if (adminChannel) {
      await cleanUpAdminChannel(adminChannel);
      await setupAdminChannel(adminChannel, client);
    } else {
      log.error(
        "Admin channel setup failed. Check adminChannelId in configuration.",
      );
    }

    log.info("Admin channel setup complete.");
  });

  client.on("interactionCreate", async (interaction) => {
    try {
      await handleInteraction(interaction, client, redisClient);
    } catch (error) {
      log.error("Error handling interaction:", error);
    }
  });

  const startSurveyStatusChecker = (redisClient) => {
    setIntervalAsync(
      async () => {
        await checkAndUpdateSurveyStatus(redisClient);
      },
      60 * 1000 * EXPIRE_STATUS_LOOP_MINUTE,
    ); // 60 * 1000 ms = 1 minute
  };

  await client.login(discordConfig.token);
})();
