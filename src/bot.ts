import { startAutoPosting } from "./lib/startAutoPosting.js";
import {
  command,
  handleAutoPost,
  handleCreate,
  handleInfo,
  handleCreateModal,
  handleRespondModal,
  handleRespond,
  handleRespondButton,
  handleView,
} from "@commands/index";

import {
  maxResponsesForMultiResponsePerUser,
  create_multi_cmd,
} from "@constants";

import { discordConfig, redisConfig, version } from "@config";
import { createClient } from "redis";
import { Client, GatewayIntentBits } from "discord.js";
import { REST } from "@discordjs/rest";
import { Routes } from "discord-api-types/v10";

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Unhandled exception:", error);
});

(async () => {
  const client = new Client({ intents: [GatewayIntentBits.Guilds] });

  const redisClient = createClient(redisConfig);
  await redisClient.connect();

  const rest = new REST({ version: "10" }).setToken(discordConfig.token);

  try {
    await rest.put(
      Routes.applicationGuildCommands(
        discordConfig.clientId,
        discordConfig.guildId,
      ),
      { body: [command.toJSON()] },
    );
    console.log("Successfully registered commands.");
  } catch (error) {
    console.error("Error registering commands", error);
  }

  client.once("ready", () => {
    console.log("Ready as ", client.user.username);
    startAutoPosting(client, redisClient);
  });

  client.on("interactionCreate", async (interaction) => {
    const { user } = interaction;

    // TODO check that for discord, usernames are
    // TODO check that for discord, users can't change this.
    //      If they aren't unique, maps should probably use ids to avoid users making multiple comments.
    const username = user.username;

    if (interaction.isChatInputCommand()) {
      const { commandName, options } = interaction;
      const surveyName = options.getString("survey");

      const subcommand = interaction.options.getSubcommand();

      switch (subcommand) {
        case "create":
        case create_multi_cmd:
          await handleCreate(interaction, subcommand, create_multi_cmd);
          break;
        case "respond":
          await handleRespond(redisClient, interaction, surveyName);
          break;
        case "view":
          await handleView(interaction, surveyName, redisClient);
          break;
        case "start-auto-post":
          await handleAutoPost(interaction, "start", client, redisClient);
          break;
        case "stop-auto-post":
          await handleAutoPost(interaction, "stop", client, redisClient);
          break;
        case "info":
          await handleInfo(interaction, version);
          break;
        default:
          console.error("unknown subcommand");
      }
    } else if (interaction.isButton()) {
      if (interaction.customId.startsWith("respondButton")) {
        const surveyName = interaction.customId.split("-").slice(1).join("-");
        await handleRespondButton(
          interaction,
          surveyName,
          redisClient,
          username,
          maxResponsesForMultiResponsePerUser,
        );
      }
    } else if (interaction.isModalSubmit()) {
      if (interaction.customId.startsWith("createModal")) {
        await handleCreateModal(interaction, username, redisClient);
      } else if (interaction.customId.startsWith("respondModal")) {
        await handleRespondModal(interaction, username, redisClient);
      }
    } else if (interaction.isAutocomplete()) {
      const surveys = await redisClient.sMembers("surveys");
      const focusedValue = interaction.options.getFocused();
      const filtered = surveys.filter((choice) =>
        choice.startsWith(focusedValue),
      );
      const start = Math.max(filtered.length - 25, 0); // Calculate starting index for slicing from the end
      const limitedChoices = filtered.slice(start);
      await interaction.respond(
        limitedChoices.map((choice) => ({ name: choice, value: choice })),
      );
    }
  });

  client.login(discordConfig.token);
})();
