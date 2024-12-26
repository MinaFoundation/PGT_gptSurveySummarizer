import log from "./logger";

import { setIntervalAsync } from "set-interval-async/dynamic";
import { startAutoPosting } from "./lib/startAutoPosting.js";
import {
  command,
  handleAutoPost,
  handleCreate,
  handleInfo,
  handleEdit,
  handleCreateModal,
  handleDeleteModal,
  handleDelete,
  handleDeleteButton,
  handleRespondModal,
  handleRespond,
  handleRespondButton,
  handleView,
  handleEditModal,
  handleSetStatus,
  handleSummary,
  handleEditSurveyCount,
  handleEditSurveyCountModal,
  handleLeaderboard,
  handleViewSurveyCounts,
  handleViewDiscordSurveyCounts,
} from "@commands/index";

import {
  maxResponsesForMultiResponsePerUser,
  create_multi_cmd,
  EXPIRE_STATUS_LOOP_MINUTE,
} from "@constants";

import { discordConfig, redisConfig, version } from "@config";
import { createClient } from "redis";
import { Client, GatewayIntentBits } from "discord.js";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";
import { threadPost } from "@lib/threadPost.js";
import { updateThreadPost } from "@lib/updateThreadPost";
import { deleteThreadPost } from "./lib";

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
    log.info("Successfully registered commands.");
  } catch (error) {
    log.error("Error registering commands", error);
  }

  client.once("ready", async () => {
    log.info("Ready as ", client.user.username);
    startAutoPosting(client, redisClient);
    startSurveyStatusChecker(redisClient);

    const adminChannelId = discordConfig.adminChannelId;
    let adminChannel;

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

    await adminChannel.send({
      content: "Admin channel connected. Authorized users only.",
    });

    log.info("Admin channel setup complete.");
  });

  const startSurveyStatusChecker = (redisClient) => {
    setIntervalAsync(
      async () => {
        await checkAndUpdateSurveyStatus(redisClient);
      },
      60 * 1000 * EXPIRE_STATUS_LOOP_MINUTE,
    ); // 60 * 1000 ms = 1 minute
  };

  client.login(discordConfig.token);
})();

const checkAndUpdateSurveyStatus = async (redisClient: any) => {
  try {
    const surveys = await redisClient.sMembers("surveys");
    const currentTime = Date.now();

    const multi = redisClient.multi();

    for (const survey of surveys) {
      multi.get(`survey:${survey}:endtime`);
      multi.get(`survey:${survey}:is-active`);
    }

    const results = await multi.exec();

    const updateMulti = redisClient.multi();

    for (let i = 0; i < surveys.length; i++) {
      const endTime = results[i * 2]; // Results of the endtime
      const isActive = results[i * 2 + 1]; // Results of the is-active

      if (endTime && isActive === "true" && currentTime >= parseInt(endTime)) {
        updateMulti.set(`survey:${surveys[i]}:is-active`, "false");
        log.info(`Survey ${surveys[i]} is now inactive.`);
      }
    }

    await updateMulti.exec();
  } catch (error) {
    log.error("Error checking and updating survey status:", error);
  }
};
