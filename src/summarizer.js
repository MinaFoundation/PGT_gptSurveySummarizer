import { createClient } from "redis";
import { gpt } from "./lib/gptClient.js";
import { redisConfig, summarizeFrequency, apikey } from "./config.js";
import {
  systemMessage,
  clusteringPrompt,
  assignmentPrompt,
  summarizePrompt,
} from "./prompts.js";

const subscribeRedisClient = createClient(redisConfig);
subscribeRedisClient.on("error", (err) =>
  console.log("Redis Client Error", err),
);

const redisClient = createClient(redisConfig);
redisClient.on("error", (err) => console.log("Redis Client Error", err));

process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Unhandled exception:", error);
});

// ==========================================================================================

const main = async () => {
  await subscribeRedisClient.connect();
  await redisClient.connect();

  while (true) {
    console.log("checking surveys for updates...");
    try {
      await checkUpdateSurveys(redisClient);
    } catch (e) {
      console.error("error while processing surveys:", e);
    }
    console.log("done checking surveys for updates.");
    await new Promise((r) => setTimeout(r, 1 * 1000));
  }

  // NOTE this updates every time a new response shows up; disabled for now
  //await subscribeRedisClient.subscribe('survey-refresh', async (surveyName) => {
  //  updateSurvey(surveyName);
  //});
};

const checkUpdateSurveys = async (redisClient) => {
  const surveys = await redisClient.sMembers("surveys");
  for (let surveyName of surveys) {
    let lastEditTime = await redisClient.get(
      `survey:${surveyName}:last-edit-time`,
    );
    let lastSummaryTime = await redisClient.get(
      `survey:${surveyName}:last-summary-time`,
    );

    lastEditTime = parseInt(lastEditTime);
    lastSummaryTime = parseInt(lastSummaryTime);

    const lastSummaryUpdateEpoch = Math.floor(
      lastSummaryTime / (summarizeFrequency * 1000),
    );
    const currentEpoch = Math.floor(Date.now() / (summarizeFrequency * 1000));

    console.log(surveyName);
    console.log(
      "\t",
      lastSummaryTime - lastEditTime,
      lastSummaryUpdateEpoch,
      currentEpoch,
    );

    if (lastEditTime != null) {
      if (lastSummaryTime == null) {
        await updateSurvey(redisClient, surveyName);
      } else {
        if (
          lastEditTime >= lastSummaryTime &&
          lastSummaryUpdateEpoch != currentEpoch
        ) {
          if (lastSummaryUpdateEpoch != currentEpoch) {
            await updateSurvey(redisClient, surveyName);
          }
        }
      }
    }
  }
};

// ==========================================================================================

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

// ==========================================================================================

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

main();
