export interface Proposal {
  proposalName: string;
  proposalDescription: string;
  proposalAuthor: string;
}

export interface Deliberation {
  proposalName: string;
  username: string;
  feedbackContent: string;
}
