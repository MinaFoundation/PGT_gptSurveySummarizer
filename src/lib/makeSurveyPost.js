import log from '../logger'
import surveyToText from "./surveyToText.js";

export const makeSurveyPost = async (redisClient, surveyName) => {
  if (!(await redisClient.sIsMember("surveys", surveyName))) {
    return [{ content: "There is no survey with that name", ephemeral: true }];
  } else {
    const [msg, files] = await surveyToText(redisClient, surveyName);

    const lines = msg.split("\n");
    const chunks = [];
    let chunk = "";
    for (const line of lines) {
      const chunkWithLine = chunk + "\n" + line;
      if (chunkWithLine.length > 2000) {
        chunks.push(chunk);
        chunk = "";
      }
      chunk = chunk + "\n" + line;
    }
    chunks.push(chunk);

    return chunks.map((chunk, i) => {
      log.debug("Making chunk", i, chunk.length);
      const toSend = { content: chunk };
      if (i == chunks.length - 1) {
        toSend.files = files;
      }
      return toSend;
    });
  }
};
