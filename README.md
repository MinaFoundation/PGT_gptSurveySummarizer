# gptSurveySummarizer

Product Requirements:
  - Users can make new surveys, which each have a list of questions
  - Users can answer surveys by providing answers to the list of questions
  - Users can see what surveys they can answer
  - Users can see the survey summary
  - Users can see which comments have not been added to the survey summary yet

Discord bot commands
  - `/gptsurvey new [surveyName]`
  - `/gptsurvey summary [surveyname]`
  - `/gptsurvey respond [surveyname]`
  - `/gptsurvey list`

Backend Architecture
  - a nodejs module that runs the discord bot code
  - a redis server that holds survey data
  - a nodejs module that monitors the redis server and updates the gpt computed survey data
      - The gpt computed survey data would be a similar process as talk to the city, just with comments instead of claims


Data format of a survey form
```
- title: text
- questions: List[text]
```

Data format of a survey summary
```
- title: text,
- topics: [
            {
              topicName: text,
              description: text,
              subtopics: [
                {
                  subtopicName: text,
                  subtopicDescription: text,
                  comments: [ 
                    {
                      submitter: text,
                      answers: List[text]
                    }
                  ]
                }
              ]
            }
          ],
- commentsNotYetCategorized: [
  {
    submitter: text,
    answers: List[text]
  }
]
```

What the discord bot response to `/gptsurvey summary [surveyname]` could look like:

### [surveyname]
#### [topic1Name]
[Description]
[# of comments in the topic]
[% of comments in the topic out of the total]
##### [subtopic1Name]
[description]
[Thread with all comments in the subtopic]
[# of comments in the subtopic]
[% of comments in the subtopic out of the # of comments in the topic]
##### [subtopic2Name]
...

#### [topic2Name]
...

#### Comments not yet categorized
These comments will be categorized when the survey summary is recomputed in [x] minutes
[Thread with all the comments not yet included in the survey summary]

