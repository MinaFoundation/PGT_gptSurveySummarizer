import {
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandStringOption,
} from "@discordjs/builders";
import { create_multi_cmd } from "@constants";

const createStringOption = (name: string, description: string, required = true) =>
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
