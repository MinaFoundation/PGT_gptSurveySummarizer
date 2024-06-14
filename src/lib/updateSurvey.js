import log from "../logger.js";

import { gpt } from "./gptClient.js";
import { apikey } from "../config.js";
import {
  systemMessage,
  clusteringPrompt,
  assignmentPrompt,
  summarizePrompt,
} from "../prompts.js";

function filterEmptySubtopics(taxonomy) {
  return taxonomy.map((t) => {
    t.subtopics = t.subtopics.filter((s) => {
      return s.responses != null && s.responses.length > 0;
    });
    return t;
  });
}

function filterEmptyTopics(taxonomy) {
  return taxonomy.filter((t) => {
    return t.subtopics.length > 0;
  });
}

function insertResponse(taxonomy, assignment, response, unmatchedResponses) {
  const { topicName, subtopicName } = assignment;
  const matchedTopic = taxonomy.find((topic) => topic.topicName === topicName);
  if (!matchedTopic) {
    log.warn("Topic mismatch, skipping response " + JSON.stringify(response));
    unmatchedResponses.push(response);
    return;
  }
  const subtopic = matchedTopic.subtopics.find(
    (subtopic) => subtopic.subtopicName === subtopicName,
  );
  if (!subtopic) {
    log.warn(
      "Subtopic mismatch, skipping response " + JSON.stringify(response),
    );
    unmatchedResponses.push(response);
    return;
  }
  if (!subtopic.responses) {
    subtopic.responses = [];
  }
  subtopic.responses.push(response);
}

function cleanupTaxonomy(taxonomy) {
  taxonomy = filterEmptySubtopics(taxonomy);
  taxonomy = filterEmptyTopics(taxonomy);
  return taxonomy;
}

const createAnonymizedMapping = (usernames) => {
  const mapping = {};
  usernames.forEach((username, index) => {
    mapping[username] = `User${index + 1}`;
  });
  return mapping;
};

const updateSurvey = async (redisClient, surveyName) => {
  log.info("Creating survey summary");

  const responseData = await redisClient.hGetAll(
    `survey:${surveyName}:responses`,
  );
  const title = await redisClient.get(`survey:${surveyName}:title`);
  const description = await redisClient.get(`survey:${surveyName}:description`);
  const surveyType = await redisClient.get(`survey:${surveyName}:type`);

  log.debug("title", title);
  log.debug("description", description);

  const usernames = Object.keys(responseData);
  const anonymizedMapping = createAnonymizedMapping(usernames);


  let responses;
  if (surveyType == "single") {
    responses = {};
    Object.entries(responseData).forEach(([username, response]) => {
      const anonUsername = anonymizedMapping[username];
      responses[anonUsername] = response;
    });
  } else {
    responses = {};
    log.debug(responseData);
    Object.entries(responseData).forEach(([username, response]) => {
      try {
        let userResponses = JSON.parse(response);
        userResponses = userResponses.filter((r) => r != "");
        userResponses.forEach((r, i) => {
          const anonUsername = anonymizedMapping[username];
          responses[anonUsername + `[${i}]`] = r;
        });
      } catch (e) {
        log.error("error processing multi-response", e);
        const anonUsername = anonymizedMapping[username];
        responses[anonUsername] = response;
      }
    });
  }

  log.debug("responses", responses);

  let { taxonomy } = await gpt(
    apikey,
    systemMessage(),
    clusteringPrompt(
      title,
      description,
      JSON.stringify(Object.values(responses)),
    ),
  );

  const batchSize = 10;

  const unmatchedResponses = [];

  for (let i = 0; i < Object.keys(responses).length; i += batchSize) {
    const batch = Object.entries(responses).slice(i, i + batchSize);
    await Promise.all(
      batch.map(async ([username, response]) => {
        const assignment = await gpt(
          apikey,
          systemMessage(),
          assignmentPrompt(
            title,
            description,
            JSON.stringify(taxonomy),
            response,
          ),
        );
        insertResponse(
          taxonomy,
          assignment,
          { response, username },
          unmatchedResponses,
        );
      }),
    );
  }

  taxonomy = cleanupTaxonomy(taxonomy);

  for (const topic of taxonomy) {
    for (const subtopic of topic.subtopics) {
      const summary = await gpt(
        apikey,
        systemMessage(),
        summarizePrompt(
          title,
          description,
          topic.topicName,
          subtopic.subtopicName,
          subtopic.subtopicDescription,
          JSON.stringify(subtopic.responses),
        ),
      );
      subtopic.subtopicSummary = summary.summary;
    }
  }

  const summary = {
    taxonomy,
    unmatchedResponses,
  };

  log.debug(JSON.stringify(summary, null, 2));

  await redisClient.set(
    `survey:${surveyName}:summary`,
    JSON.stringify(summary),
  );
  await redisClient.set(`survey:${surveyName}:last-summary-time`, Date.now());
};

export { updateSurvey };
