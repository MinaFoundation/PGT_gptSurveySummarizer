import log from "../logger.js";
import OpenAI from "openai";
import { apikey } from "@config";
import { responseMeaningfullnessPrompt } from "src/prompts";

export async function isMeaningful(response) {
  if (!response) {
    return false;
  }

  try {
    const openai = new OpenAI({ apikey });

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "user", content: responseMeaningfullnessPrompt(response) },
      ],

      response_format: { type: "json_object" },
    });

    log.debug(
      "Is meaningful: ",
      JSON.parse(completion.choices[0].message.content).isMeaningful,
    );
    return JSON.parse(completion.choices[0].message.content).isMeaningful;
  } catch (error) {
    log.error(`Error while evaulating the response is meaningful: ${error}`);
  }
}
