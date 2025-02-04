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

export interface GovbotProposal {
  proposalId: number;
  proposalName: string;
  proposalDescription: string;
  proposalAuthor: string;
  endTime: Date;
  fundingRoundId: number;
}

export interface ProposalFeedback {
  proposalId: string;
  username: string;
  feedbackContent: string;
}

export interface ProposalSummary {
  proposalId: number;
  proposalSummary: string;
  fundingRoundId: number;
}

export interface ProposalFeedbacksSummary {
  proposalId: number;
  feedbackSummary: string;
}
