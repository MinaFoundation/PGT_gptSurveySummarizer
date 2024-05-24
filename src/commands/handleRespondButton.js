import {
  ModalBuilder,
  TextInputBuilder,
  ActionRowBuilder,
  TextInputStyle,
} from "discord.js";

export const handleRespondButton = async (
  interaction,
  surveyName,
  redisClient,
  username,
  maxResponsesForMultiResponsePerUser,
) => {
  const surveyType = await redisClient.get(`survey:${surveyName}:type`);
  const hadResponse = await redisClient.hExists(
    `survey:${surveyName}:responses`,
    username,
  );
  const plural = surveyType === "single" ? "" : "s";
  const modal = new ModalBuilder()
    .setCustomId(`respondModal-${surveyName}`)
    .setTitle(`Survey Response${plural}`);

  const label = hadResponse
    ? `Please update your response${plural} below`
    : `Please enter your response${plural} below`;

  if (surveyType === "single") {
    const defaultText = hadResponse
      ? await redisClient.hGet(`survey:${surveyName}:responses`, username)
      : "";
    const responseInput = new TextInputBuilder()
      .setCustomId("responseInput")
      .setLabel(label)
      .setStyle(TextInputStyle.Paragraph)
      .setValue(defaultText)
      .setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(responseInput));
  } else {
    let priorResponses = new Array(maxResponsesForMultiResponsePerUser).fill(
      "",
    );
    if (hadResponse) {
      const priorResponseData = await redisClient.hGet(
        `survey:${surveyName}:responses`,
        username,
      );
      try {
        priorResponses = JSON.parse(priorResponseData);
      } catch (e) {
        console.error("error processing multi-response", e);
        priorResponses = [priorResponseData];
      }
    }
    const components = new Array(maxResponsesForMultiResponsePerUser)
      .fill(null)
      .map((_, i) => {
        const responseInput = new TextInputBuilder()
          .setCustomId(`responseInput-${i}`)
          .setLabel(i === 0 ? `${label}:` : `Response ${i + 1}:`)
          .setStyle(TextInputStyle.Paragraph)
          .setValue(priorResponses[i])
          .setRequired(i === 0);
        return new ActionRowBuilder().addComponents(responseInput);
      });
    modal.addComponents(components);
  }

  await interaction.showModal(modal);
};
