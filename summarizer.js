import 'dotenv/config'
import OpenAI from "openai";
import { createClient } from 'redis';

const subscribeRedisClient = createClient({ url: process.env.REDIS_URL });
subscribeRedisClient.on('error', err => console.log('Redis Client Error', err));

const redisClient = createClient({ url: process.env.REDIS_URL });
redisClient.on('error', err => console.log('Redis Client Error', err));

const summarizeFrequency = process.env.SUMMARIZE_FREQUENCY_SECONDS;

// ==========================================================================================

const main = async () => {
  await subscribeRedisClient.connect();
  await redisClient.connect();

  while (true) {
    await checkUpdateSurveys(redisClient);
    await new Promise((r) => setTimeout(r, 30*1000));
  }

  // NOTE this updates every time a new response shows up; disabled for now
  //await subscribeRedisClient.subscribe('survey-refresh', async (surveyName) => {
  //  updateSurvey(surveyName);
  //});
};

const checkUpdateSurveys = async (redisClient) => {
  const surveys = await redisClient.sMembers('surveys');
  for (let surveyName of surveys){
    let lastEditTime = await redisClient.get(`survey:${surveyName}:last-edit-time`);
    let lastSummaryTime = await redisClient.get(`survey:${surveyName}:last-summary-time`);

    lastEditTime = parseInt(lastEditTime);
    lastSummaryTime = parseInt(lastSummaryTime);

    const lastSummaryUpdateEpoch = Math.floor(lastSummaryTime/(summarizeFrequency*1000));
    const currentEpoch = Math.floor(Date.now()/(summarizeFrequency*1000));

    console.log(surveyName);
    console.log('\t', lastSummaryTime - lastEditTime, lastSummaryUpdateEpoch, currentEpoch);

    if (lastEditTime != null) {
      if (lastSummaryTime == null) {
        await updateSurvey(redisClient, surveyName);
      } else {
        if (lastEditTime >= lastSummaryTime && lastSummaryUpdateEpoch != currentEpoch) {
          if (lastSummaryUpdateEpoch != currentEpoch) {
            await updateSurvey(redisClient, surveyName);
          }
        }
      }
    }
  }

}

// ==========================================================================================

const updateSurvey = async (
  redisClient,
  surveyName
) => {
  console.log('creating survey summary');

  const responses = await redisClient.hGetAll(`survey:${surveyName}:responses`);
  const title = await redisClient.get(`survey:${surveyName}:title`);
  const description = await redisClient.get(`survey:${surveyName}:description`);

  console.log('title', title)
  console.log('description', description)
  console.log('responses', responses)

  const apikey = process.env.OPENAI_API_KEY;

  const { taxonomy } = await gpt(
    apikey,
    systemMessage(),
    clusteringPrompt(title, description, JSON.stringify(Object.values(responses))),
  );

  const batchSize = 10;

  const unmatchedResponses = [];

  for (let i = 0; i < Object.keys(responses).length; i += batchSize) {
    const batch = Object.entries(responses).slice(i, i + batchSize);
    await Promise.all(
      batch.map(async ([ username, response ]) => {
        const assignment = await gpt(
          apikey,
          systemMessage(),
          assignmentPrompt(title, description, JSON.stringify(taxonomy), response)
        );
        insertResponse(
          taxonomy,
          assignment,
          { response, username },
          unmatchedResponses,
        );
      })
    );
  }

  const summary = {
    taxonomy,
    unmatchedResponses,
  }

  console.log(JSON.stringify(summary, null, 2));

  await redisClient.set(`survey:${surveyName}:summary`, JSON.stringify(summary));
  await redisClient.set(`survey:${surveyName}:last-summary-time`, Date.now());
}

// ==========================================================================================

const gpt = async (
  apikey,
  system,
  user,
) => {
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
  const result = JSON.parse(message.content);
  return result;
}

export const systemMessage = () => `
You are a professional research assistant. You have helped run many public consultations, 
surveys and citizen assemblies. You have good instincts when it comes to extracting interesting insights. 
You are familiar with public consultation tools like Pol.is and you understand the benefits 
for working with very clear, concise claims that other people would be able to vote on.
`;

export const clusteringPrompt = (title, description, responses) => `
I will give you a survey title, description, and a list of responses.
I want you to propose a way to break down the information contained in these responses into topics and subtopics of interest. 
Keep the topic and subtopic names very concise and use the short description to explain what the topic is about. Each topic must have at least one subtopic.

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

export const assignmentPrompt = (
  title, 
  description, 
  taxonomy,
  response,
) => `
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

function insertResponse(taxonomy, assignment, response, unmatchedResponses) {
  const { topicName, subtopicName } = assignment;
  const matchedTopic = taxonomy.find((topic) => topic.topicName === topicName);
  if (!matchedTopic) {
    console.log("Topic mismatch, skipping response " + JSON.stringify(response));
    unmatchedResponses.push(response);
    return;
  }
  const subtopic = matchedTopic.subtopics.find(
    (subtopic) => subtopic.subtopicName === subtopicName
  );
  if (!subtopic) {
    console.log("Subtopic mismatch, skipping response " + JSON.stringify(response));
    unmatchedResponses.push(response);
    return;
  }
  if (!subtopic.responses) {
    subtopic.responses = [];
  }
  subtopic.responses.push(response);
}

main()
