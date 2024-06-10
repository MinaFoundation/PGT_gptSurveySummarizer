import {
  ModalBuilder,
  TextInputBuilder,
  ActionRowBuilder,
  TextInputStyle,
} from "discord.js";

export const handleRespondButton = async (
  interaction: any,
  surveyName: any,
  redisClient: any,
  username: any,
  maxResponsesForMultiResponsePerUser: any,
) => {
  const surveyType = await redisClient.get(`survey:${surveyName}:type`);
  const description = await redisClient.get(`survey:${surveyName}:description`);
  const fields = await redisClient.get(`survey:${surveyName}:fields`);
  const hadResponse = await redisClient.hExists(
    `survey:${surveyName}:responses`,
    username,
  );
  if ((await redisClient.get(`survey:${surveyName}:is-active`)) == "false") {
    await interaction.reply({
      content:
        "The survey is currently inactive, so you can't submit any answers.",
      ephemeral: true,
    });
    return;
  }

  const plural = surveyType === "single" ? "" : "s";
  const modal = new ModalBuilder()
    .setCustomId(`respondModal-${surveyName}`)
    .setTitle(`${surveyName}`);

  const label = hadResponse
    ? `Please update your response${plural} here`
    : `Please enter your response${plural} here`;

  if (surveyType === "single") {
    const defaultText = hadResponse
      ? await redisClient.hGet(`survey:${surveyName}:responses`, username)
      : "";
    const responseInput = new TextInputBuilder()
      .setCustomId("responseInput")
      .setLabel(fields)
      .setStyle(TextInputStyle.Paragraph)
      .setValue(defaultText)
      .setPlaceholder(label)
      .setRequired(true);
    modal.addComponents(new ActionRowBuilder().addComponents(responseInput));
  } else {
    const multipleQuestions = fields.split("\n");

    let priorResponses = new Array(multipleQuestions.length).fill("");
    if (hadResponse) {
      const priorResponseData = await redisClient.hGet(
        `survey:${surveyName}:responses`,
        username,
      );
      try {
        priorResponses = JSON.parse(priorResponseData);
      } catch (e) {
        console.error("error processing multi-response priorResponseData", e);
        priorResponses = [priorResponseData];
      }
    }

    const components = new Array(multipleQuestions.length)
      .fill(null)
      .map((_, i) => {
        const responseInput = new TextInputBuilder()
          .setCustomId(`responseInput-${i}`)
          .setLabel(multipleQuestions[i])
          .setStyle(TextInputStyle.Paragraph)
          .setPlaceholder(`Survey Description: ${description}`)
          .setValue(priorResponses[i] || "")
          .setRequired(i === 0);
        return new ActionRowBuilder().addComponents(responseInput);
      });
    modal.addComponents(components);
  }

  await interaction.showModal(modal);
};
