# gptSurveySummarizer

Product Requirements:
  - Users can make new surveys, which each have a list of questions
  - Users can answer surveys by providing answers to the list of questions
  - Users can see what surveys they can answer
  - Users can see the survey summary
  - Users can see which comments have not been added to the survey summary yet

Discord bot commands
  - /gptsurvey new [surveyName]
  - /gptsurvey summary [surveyname]
  - /gptsurvey respond [surveyname]

Backend Architecture
  - a nodejs module that runs the discord bot code
  - a redis server that holds survey data
  - a nodejs module that monitors the redis server and updates the gpt computed survey data

The gpt computed survey data would be a similar process as talk to the city, just with comments instead of claims
