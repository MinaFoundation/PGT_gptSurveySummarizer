import { ChatInputCommandInteraction } from "discord.js";

export const handleInfo = async (
  interaction: any,
  version: any,
) => {
  const github = "https://github.com/MinaFoundation/gptSurveySummarizer";
  await interaction.reply({
    content: `version number ${version}\n\nLearn more about the project on our [github](${github}).`,
    ephemeral: true,
  });
};
