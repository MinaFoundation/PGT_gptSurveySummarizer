import { gpt } from "./gptClient.js";
import {
  systemMessage,
  clusteringPrompt,
  assignmentPrompt,
  summarizePrompt,
} from "../prompts.js";

function insertResponse(taxonomy, assignment, response, unmatchedResponses) {
  const { topicName, subtopicName } = assignment;
  const matchedTopic = taxonomy.find((topic) => topic.topicName === topicName);
  if (!matchedTopic) {
    console.log(
      "Topic mismatch, skipping response " + JSON.stringify(response),
    );
    unmatchedResponses.push(response);
    return;
  }
  const subtopic = matchedTopic.subtopics.find(
    (subtopic) => subtopic.subtopicName === subtopicName,
  );
  if (!subtopic) {
    console.log(
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

const updateSurvey = async (redisClient, surveyName) => {
  console.log("creating survey summary");

  const responseData = await redisClient.hGetAll(
    `survey:${surveyName}:responses`,
  );
  const title = await redisClient.get(`survey:${surveyName}:title`);
  const description = await redisClient.get(`survey:${surveyName}:description`);
  const surveyType = await redisClient.get(`survey:${surveyName}:type`);

  console.log("title", title);
  console.log("description", description);

  let responses;
  if (surveyType == "single") {
    responses = responseData;
  } else {
    responses = {};
    console.log(responseData);
    Object.entries(responseData).forEach(([username, response]) => {
      try {
        let userResponses = JSON.parse(response);
        userResponses = userResponses.filter((r) => r != "");
        userResponses.forEach((r, i) => {
          responses[username + `[${i}]`] = r;
        });
      } catch (e) {
        console.error("error processing multi-response", e);
        responses[username] = response;
      }
    });
  }

  console.log("responses", responses);

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

  console.log(JSON.stringify(summary, null, 2));

  await redisClient.set(
    `survey:${surveyName}:summary`,
    JSON.stringify(summary),
  );
  await redisClient.set(`survey:${surveyName}:last-summary-time`, Date.now());
};

export { updateSurvey };
