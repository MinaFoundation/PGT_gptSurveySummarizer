export interface Proposal {
  proposalName: string;
  proposalDescription: string;
  proposalAuthor: string;
  endTime: Date;
}

export interface Deliberation {
  proposalName: string;
  username: string;
  feedbackContent: string;
}
