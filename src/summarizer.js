import "dotenv/config";
import OpenAI from "openai";
import { createClient } from "redis";
import { redisConfig } from "./config";

const subscribeRedisClient = createClient(redisConfig);
subscribeRedisClient.on("error", (err) =>
  console.log("Redis Client Error", err),
);

const redisClient = createClient(redisConfig);
redisClient.on("error", (err) => console.log("Redis Client Error", err));

const summarizeFrequency = process.env.SUMMARIZE_FREQUENCY_SECONDS;

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

  const apikey = process.env.OPENAI_API_KEY;

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

const gpt = async (apikey, system, user, maxTries = 5) => {
  const openai = new OpenAI({ apikey });

  const completion = await openai.chat.completions.create({
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    //model: "gpt-3.5-turbo",
    model: "gpt-4-turbo-preview",
    response_format: { type: "json_object" },
  });
  const { finish_reason, message } = completion.choices[0];
  let result;
  try {
    result = JSON.parse(message.content);
  } catch (e) {
    console.error("error while processing gpt response:", e);
    console.error("gpt response:", message.content);
    if (maxTries == 1) {
      throw e;
    } else {
      console.log("trying again; tries remaining", maxTries - 1);
      return await gpt(apikey, system, user, maxTries - 1);
    }
  }
  return result;
};

export const systemMessage = () => `
You are a professional research assistant. You have helped run many public consultations, 
surveys and citizen assemblies. You have good instincts when it comes to extracting interesting insights. 
You are familiar with public consultation tools like Pol.is and you understand the benefits 
for working with very clear, concise claims that other people would be able to vote on.
`;

export const clusteringPrompt = (title, description, responses) => `
I will give you a survey title, description, and a list of responses.
I want you to propose a way to break down the information contained in these responses into topics and subtopics of interest. 
Keep the topic and subtopic names very concise and use the short description to explain what the topic is about. Each topic must have at least one subtopic. Do not return more topics or subtopics than there are responses.

Return a JSON object of the form {
  "taxonomy": [
    {
      "topicName": string, 
      "topicShortDescription": string,
      "subtopics": [
        {
          "subtopicName": string,  
          "subtopicShortDescription": string, 
        },
        ...
      ]
    }, 
    ... 
  ]
}

Now here is the survey title: ${title}

The survey description: ${description}

And here is the list of responses:
${responses}
`;

export const assignmentPrompt = (title, description, taxonomy, response) => `
I'm going to give you a response made by a participant to a survey, the title and description of the survey, and a list of topics and subtopics which have already been extracted from the survey.
I want you to assign each response to the best matching topic and subtopic in the taxonomy. The topic must be a member of the taxonomy, and the subtopic must be a member of the topic.

Return a JSON object of the form {
  "topicName": string // from the given list of topics
  "subtopicName": string // from the list of subtopics
}

Now here is the survey title: ${title}

The survey description: ${description}

And here is the list of topics/subtopics: 
taxonomy: ${taxonomy}

And then here is the response:
${response} 
`;

const summarizePrompt = (
  title,
  description,
  topic,
  subtopic,
  subtopicDescription,
  responses,
) => `
I'm going to give you a survey title, survey description, response topic, response subtopic, and responses in that subtopic. I want you to produce a summary of the responses. Keep the summary concise, but complete.

Return a JSON object of the form {
  "summary": string
}

Now here is the survey title: ${title}

The survey description: ${description}

And here is the topic, subtopic, and responses.
Topic: ${topic}
Subtopic: ${subtopic}
Subtopic Description: ${subtopicDescription}
Responses: ${responses}
`;

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
