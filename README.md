# gptSurveySummarizer

This would be:

A UI build on shadcn
  a. composed of surveys each on a different page
  b. you can login with your discord
  c. you can make a survey, which is a list of questions
  d. users logged in with discord can answer the survey
  e. the survey is updated periodically to take into account the latest answers

Backend Architecture
  a. a nodejs server that is statically serving the shadcn ui
  b. a nodejs server that receives survey answers from the ui
  c. a redis server that holds survey data
  d. a nodejs server that monitors the redis server and updates the gpt computed survey data

The gpt computed survey data would be a similar process as talk to the city, just with comments instead of claims
