export const PROPOSAL_SUMMARIZE_PROMPT = (
  proposalName,
  proposalDescription,
  proposalAuthor,
  fundingRoundId,
) =>
  `
Summarize the following Mina Ecosystem Funding project proposal in a concise and clear manner. 
Include the proposal name, a brief overview of its purpose, the author's name, and the funding round it belongs to. 
Ensure the summary highlights the core objectives and potential impact of the proposal.

Proposal Details:
- Proposal Name: ${proposalName}
- Description: ${proposalDescription}
- Author: ${proposalAuthor}
- Funding Round ID: ${fundingRoundId}

Summary Guideline:
* Start with a one or two sentence overview of the proposal.
* Summarize its main goals and intended outcomes.
* Mention the relevance of the project to the Mina Ecosystem.
* Keep the summary within 3-6 sentences while maintaining clarity and completeness.
`.trim();

type FeedbackDictionary = { [username: string]: string };

function formatFeedbacks(feedbacks: FeedbackDictionary): string {
  return Object.entries(feedbacks)
    .map(([username, feedback]) => `${username}: "${feedback}"`)
    .join("\n");
}

export const FEEDBACK_SUMMARIZE_PROMPT = (
  proposalName,
  proposalDescription,
  proposalAuthor,
  fundingRoundId,
  feedbacks,
) =>
  `
You are an AI assistant that specializes in summarizing project proposals and their associated feedbacks. 
Your task is to generate a concise and insightful summary for the given project proposals and especially 
their feedbacks for Mina Ecosystem Funding program. You need to include all meaningful summarized feedbacks.

You are given these datas to summarize:
- Proposal Name: ${proposalName}
- Description: ${proposalDescription}
- Author: ${proposalAuthor}
- Funding Round ID: ${fundingRoundId}
- Feedbacks: ${formatFeedbacks(feedbacks)}

Summary Guideline:
Your response should focus primarily on analyzing and summarizing the feedback.
* Brief Proposal Summary: A 2-3 sentence summary explaining the core idea, objective, and significance of the proposal.
* Key Strengths (Based on Feedbacks): Highlight the main positive aspects of the proposal as mentioned by users.
* Main Concerns (Based on Feedbacks): Identify common criticisms, potential risks, or areas that need improvement.
* Recurring Themes in Feedback: Identify common points that multiple users have mentioned.
Include insights such as usability concerns, technical feasibility, business potential, or ethical considerations.
* Overall Sentiment: Determine whether the general sentiment is positive, neutral, or negative based on user feedback.
* Constructive Suggestions: If applicable, provide recommendations for improving the proposal.
* Edge Opinions: Include edge sentiments if you thinks it is meaningful as an great AI Agent.

`.trim();
