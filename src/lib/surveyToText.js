import log from "../logger.js";

import { AttachmentBuilder } from "discord.js";
import { summarizeFrequency } from "../config.js";

const createAnonymizedMapping = (usernames) => {
  const mapping = {};
  usernames.forEach((username, index) => {
    mapping[username] = `User${index + 1}`;
  });
  return mapping;
};

export default async function surveyToText(redisClient, surveyName) {
  const summaryJSON = await redisClient.get(`survey:${surveyName}:summary`);
  const description = await redisClient.get(`survey:${surveyName}:description`);
  const surveyType = await redisClient.get(`survey:${surveyName}:type`);
  const creator = await redisClient.get(`survey:${surveyName}:username`);
  const responses = await redisClient.hGetAll(`survey:${surveyName}:responses`);
  const summary = JSON.parse(summaryJSON);

  const summarizedResponses = [];

  const totalResponseCount = Object.entries(responses).length;

  const toPercent = (p) =>
    p.toLocaleString(undefined, { style: "percent", maximumFractionDigits: 0 });

  const pluralize = (n) => (n == 1 ? "" : "s");

  const divider = `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n`;

  const number_to_discord_number = {
    0: ":zero:",
    1: ":one:",
    2: ":two:",
    3: ":three:",
    4: ":four:",
    5: ":five:",
    6: ":six:",
    7: ":seven:",
    8: ":eight:",
    9: ":nine:",
  };

  const number_to_discord_letter = {
    0: ":regional_indicator_a:",
    1: ":regional_indicator_b:",
    2: ":regional_indicator_c:",
    3: ":regional_indicator_d:",
    4: ":regional_indicator_e:",
    5: ":regional_indicator_f:",
    6: ":regional_indicator_g:",
    7: ":regional_indicator_h:",
    8: ":regional_indicator_i:",
    9: ":regional_indicator_j:",
  };

  const number_to_letter = {
    0: "A",
    1: "B",
    2: "C",
    3: "D",
    4: "E",
    5: "F",
    6: "G",
    7: "H",
    8: "I",
    9: "J",
  };

  const usernames = Object.keys(responses);
  const anonymizedMapping = createAnonymizedMapping(usernames);

  const anonymizedResponses = {};
  Object.entries(responses).forEach(([username, response]) => {
    const anonUsername = anonymizedMapping[username];
    anonymizedResponses[anonUsername] = response;
  });

  let msg = "";
  msg += `# :ballot_box: ${surveyName}\n`;
  msg += divider;
  msg += `:page_facing_up: ${description}\n`;
  msg += `:thought_balloon: created by ${creator}\n`;
  msg += `:speech_balloon: ${totalResponseCount} responses\n`;
  if (summary.taxonomy != null && Object.keys(summary.taxonomy).length > 0) {
    msg += divider;
  }

  const threads = [];

  const formatResponse = (surveyType, response, responses) => {
    let responseIsLatest;
    if (surveyType == "single") {
      const latestResponse = anonymizedResponses[response.username];
      responseIsLatest = latestResponse == response.response;
    } else {
      const baseUsername = response.username.split("[")[0];
      let userResponses;
      try {
        userResponses = JSON.parse(anonymizedResponses[baseUsername]);
      } catch (e) {
        log.error("error processing multi-response", e);
        userResponses = [anonymizedResponses[response.username]];
      }
      responseIsLatest = userResponses.some((r) => r == response.response);
    }
    if (responseIsLatest) {
      return response.username + ' said "' + response.response + '"';
    } else {
      return (
        response.username +
        ' previously said "' +
        response.response +
        '". The next update will include their latest response.'
      );
    }
  };

  if (summary.taxonomy != null) {
    for (const [index, topic] of summary.taxonomy.entries()) {
      const topicResponseCount = topic.subtopics
        .map((s) => (s.responses == null ? 0 : s.responses.length))
        .reduce((ps, v) => ps + v, 0);

      msg += `## ${number_to_discord_number[index + 1]} `;
      msg += `${topic.topicName} [${topicResponseCount} response${pluralize(topicResponseCount)}]\n`;
      msg += `${topic.topicShortDescription}\n`;
      msg += `\n`;

      for (const [subindex, subtopic] of topic.subtopics.entries()) {
        const subtopicResponseCount =
          subtopic.responses == null ? 0 : subtopic.responses.length;

        msg += `> ${number_to_discord_letter[subindex]} `;
        msg += `**${subtopic.subtopicName} [${subtopicResponseCount} response${pluralize(subtopicResponseCount)}]**\n`;

        msg += `> ${subtopic.subtopicShortDescription}\n> \n`;

        msg += `> ${subtopic.subtopicSummary}\n\n`;

        if (subtopic.responses != null && subtopic.responses.length > 0) {
          const responseMessages = subtopic.responses.map((response) => {
            summarizedResponses.push(response);
            return formatResponse(surveyType, response, responses);
          });

          const title = `${index + 1}${number_to_letter[subindex]} ${topic.topicName} → ${subtopic.subtopicName}`;

          threads.push({
            title,
            responseMessages,
          });
        }
      }
    }
  }
  if (
    summary.unmatchedResponses != null &&
    summary.unmatchedResponses.length > 0
  ) {
    msg += divider;
    msg += `### Unmatched Responses\n`;
    msg += `:speech_balloon: Responses not matched with any topic: ${summary.unmatchedResponses.length}\n`

    const responseMessages = summary.unmatchedResponses.map((response) => {
      summarizedResponses.push(response);
      return formatResponse(surveyType, response, responses);
    });

    const title = "Unmatched responses";

    threads.push({
      title,
      responseMessages,
    });
  }

  const unsummarizedResponses = [];

  if (surveyType == "single") {
    for (let [username, response] of Object.entries(anonymizedResponses)) {
      const responseIncluded = summarizedResponses.some(
        (sr) => sr.username == username && sr.response == response,
      );
      if (!responseIncluded) {
        unsummarizedResponses.push({ username, response });
      }
    }
  } else {
    for (let [username, response] of Object.entries(anonymizedResponses)) {
      let userResponses;
      try {
        userResponses = JSON.parse(response);
      } catch (e) {
        log.error("error processing multi-response", e);
        userResponses = [response];
      }
      userResponses = userResponses.filter((r) => r != "");
      userResponses.forEach((response) => {
        const responseIncluded = summarizedResponses.some(
          (sr) =>
            sr.username.split("[")[0] == username && sr.response == response,
        );
        if (!responseIncluded) {
          unsummarizedResponses.push({ username, response });
        }
      });
    }
  }

  msg += divider;

  if (unsummarizedResponses.length > 0) {
    msg += `## :new: Responses Not Yet Categorized\n`;
    const unsummarizedResponseCount = unsummarizedResponses.length;
    msg += `:speech_balloon: Responses not included in the current summary: ${unsummarizedResponseCount}\n`;
    const timeSinceLastUpdate = Date.now() % (summarizeFrequency * 1000);
    const timeOfLastUpdate = Date.now() - timeSinceLastUpdate;
    const timeOfNextUpdate = timeOfLastUpdate + summarizeFrequency * 1000;
    const secondsTilNextUpdate = (timeOfNextUpdate - Date.now()) / 1000;
    const minutesTilNextUpdate = Math.ceil(secondsTilNextUpdate / 60);
    msg += `:timer: ${minutesTilNextUpdate} minutes until the next summary update.\n`;

    const responseMessages = unsummarizedResponses.map((response) => {
      return response.username + ' said "' + response.response + '"';
    });

    const title = "New responses not yet categorized";

    threads.push({
      title,
      responseMessages,
    });
  } else {
    msg += `:green_circle: All responses have been included in the current survey summary\n`;
  }
  if (threads.length > 0) {
    msg += divider;
  }

  const content = "";
  const files = [];
  if (threads.length > 0) {
    let content = "";

    for (const thread of threads) {
      const { title, responseMessages } = thread;

      content += title + "\n";
      for (const response of responseMessages) {
        content += "    " + response + "\n";
      }
      content += "\n";
    }
    files.push(
      new AttachmentBuilder(Buffer.from(content)).setName("responses.txt"),
    );
  }

  return [msg, files];
}

function formatResponse(surveyType, response, anonymizedResponses) {
  let responseIsLatest;
  if (surveyType == "single") {
    const latestResponse = anonymizedResponses[response.username];
    responseIsLatest = latestResponse == response.response;
  } else {
    const baseUsername = response.username.split("[")[0];
    let userResponses;
    try {
      userResponses = JSON.parse(anonymizedResponses[baseUsername]);
    } catch (e) {
      log.error("error processing multi-response", e);
      userResponses = [anonymizedResponses[response.username]];
    }
    responseIsLatest = userResponses.some((r) => r == response.response);
  }
  if (responseIsLatest) {
    return response.username + ' said "' + response.response + '"';
  } else {
    return (
      response.username +
      ' previously said "' +
      response.response +
      '". The next update will include their latest response.'
    );
  }
}
