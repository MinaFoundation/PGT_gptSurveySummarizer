import {
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandStringOption,
} from "@discordjs/builders";
import { create_multi_cmd } from "@constants";

const createStringOption = (
  name: string,
  description: string,
  required = true,
) =>
  new SlashCommandStringOption()
    .setName(name)
    .setDescription(description)
    .setAutocomplete(true)
    .setRequired(required);

const createSubcommand = (name: string, description: string, options = []) => {
  const subcommand = new SlashCommandSubcommandBuilder()
    .setName(name)
    .setDescription(description);
  options.forEach((option) => subcommand.addStringOption(option));
  return subcommand;
};

const createChoiceOption = (
  name: string,
  description: string,
  choices: { name: string; value: string }[],
  required = true,
) => {
  const option = new SlashCommandStringOption()
    .setName(name)
    .setDescription(description)
    .setRequired(required);
  choices.forEach((choice) => option.addChoices(choice));
  return option;
};

const is_dev = process.argv[2] == "--dev";
const prefix = is_dev ? "dev_" : "";

export const command = new SlashCommandBuilder()
  .setName(`${prefix}gptsurvey`)
  .setDescription(
    "Create, respond to, and view GPT-powered natural language surveys.",
  )
  .addSubcommand(
    createSubcommand(
      "create",
      "Create a new survey, with one response per user. This is best for sentiment and questions.",
    ),
  )
  .addSubcommand(
    createSubcommand("delete", "Delete a survey", [
      createStringOption("survey", "Survey name"),
    ]),
  )
  .addSubcommand(
    createSubcommand("edit", "Edit a survey", [
      createStringOption("survey", "Survey name"),
    ]),
  )
  .addSubcommand(
    createSubcommand(
      create_multi_cmd,
      "Create a new survey, with up to 5 responses per user. This is best for brainstorming and feedback.",
    ),
  )
  .addSubcommand(
    createSubcommand("respond", "Respond to a survey", [
      createStringOption("survey", "Survey name"),
    ]),
  )
  .addSubcommand(
    createSubcommand("view", "View the summary and responses for a survey", [
      createStringOption("survey", "Survey name"),
    ]),
  )
  .addSubcommand(
    createSubcommand("edit-survey-count", "Edit survey count of an user"),
  )
  .addSubcommand(
    createSubcommand("create-survey-leaderboard", "Create survey leaderboard"),
  )
  .addSubcommand(
    createSubcommand("view-survey-counts", "View survey counts of users"),
  )
  .addSubcommand(
    createSubcommand(
      "view-discord-survey-counts",
      "View survey counts of users responded by Discord",
    ),
  )
  .addSubcommand(
    createSubcommand(
      "summary",
      "View the summary and responses for a survey without raw data",
      [
        createStringOption("survey", "Survey name"),
        createChoiceOption(
          "summarytype",
          "Would you like to have high level summary?",
          [
            { name: "Yes", value: "yes" },
            { name: "No", value: "no" },
          ],
        ),
      ],
    ),
  )
  .addSubcommand(
    createSubcommand(
      "set-status",
      "Set status of survey, activate or deactivate",
      [
        createStringOption("survey", "Survey name"),
        createChoiceOption("status", "Choose status", [
          { name: "Active", value: "active" },
          { name: "Deactivate", value: "deactivate" },
        ]),
      ],
    ),
  )
  .addSubcommand(
    createSubcommand(
      "start-auto-post",
      "Start automatically posting a survey on this channel regularly",
      [createStringOption("survey", "Survey name")],
    ),
  )
  .addSubcommand(
    createSubcommand(
      "stop-auto-post",
      "Stop automatically posting a survey on this channel regularly",
      [createStringOption("survey", "Survey name")],
    ),
  )
  .addSubcommand(createSubcommand("info", "View the version number"));
