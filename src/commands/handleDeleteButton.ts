import {
  ModalBuilder,
  TextInputBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  TextInputStyle,
  ButtonStyle,
} from "discord.js";

export const handleDeleteButton = async (
  interaction: any,
  surveyName: any,
  redisClient: any,
  username: any,
) => {
  const surveyType = await redisClient.get(`survey:${surveyName}:type`);
  const hadResponse = await redisClient.hExists(
    `survey:${surveyName}:responses`,
    username,
  );

  // Warning message as a text input component (read-only)
  const warningMessage = new TextInputBuilder()
    .setCustomId("warningMessage")
    .setLabel("Are you sure you want to delete this survey?")
    .setStyle(TextInputStyle.Short) // Use 'Paragraph' for longer text
    .setValue("This action cannot be undone.")
    .setRequired(true) // User must interact with this field

  const yesButton = new ButtonBuilder()
    .setCustomId(`confirmDelete-${surveyName}`)
    .setLabel("Yes")
    .setStyle(ButtonStyle.Danger); // Red button for 'delete' actions

  const noButton = new ButtonBuilder()
    .setCustomId("cancelDelete")
    .setLabel("No")
    .setStyle(ButtonStyle.Secondary); // Grey button for 'cancel' actions

  // Adding components to action rows
  const firstRow = new ActionRowBuilder<TextInputBuilder>().addComponents(
    warningMessage,
  );
  const secondRow = new ActionRowBuilder<ButtonBuilder>().addComponents(
    yesButton,
    noButton,
  );

  // Creating and configuring the modal
  const modal = new ModalBuilder()
    .setCustomId(`deleteModal-${surveyName}`)
    .setTitle(`Delete Survey`)
    .addComponents(firstRow, secondRow);

  // Show the modal to the user
  await interaction.showModal(modal);
};
