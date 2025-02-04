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

export const FEEDBACK_SUMMARIZE_PROMPT = (username, feedbackContent) =>
  ``.trim();
