export interface Proposal {
    proposalName: string;
    proposalDescription: string;
    proposalAuthor: string;
    lastEditTime: Date;
}

export interface Deliberation {
  proposalName: string;
  username: string;
  feedbackContent: string;
}
