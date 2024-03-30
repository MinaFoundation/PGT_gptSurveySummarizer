# gptSurveySummarizer

This would be:

A UI build on shadcn
  - composed of surveys each on a different page
  - users can login with your discord
  - users can make a survey, which is a list of questions
  - users logged in with discord can answer the survey
  - the survey is updated periodically to take into account the latest answers

Backend Architecture
  - a nodejs server that is statically serving the shadcn ui
  - a nodejs server that receives survey answers from the ui
  - a redis server that holds survey data
  - a nodejs server that monitors the redis server and updates the gpt computed survey data

The gpt computed survey data would be a similar process as talk to the city, just with comments instead of claims