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

export const summarizePrompt = (
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

export const executiveSummarizePrompt = (
  title,
  description,
  summary
) => `
I'm going to give you a survey title, survey description, and summary of the survey. I want you to produce an very short high level executive summary of the summary for executive directors and stakeholders , to have a quick read, highlighting the main ideas in bullet points.

Return a JSON object of the form {
  "executivesummary": string
}

Now here is the survey title: ${title}

The survey description: ${description}

And here is the summary.
Summary: ${summary}
`