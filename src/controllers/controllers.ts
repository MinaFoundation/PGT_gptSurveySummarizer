import redisClient from "./redisClient";

import { Request, Response } from "express";

import {
  GovbotProposal,
  ProposalFeedback,
  ProposalSummary,
  ProposalFeedbacksSummary,
} from "src/models/govbotModel";

import log from "../logger";

function proposalSummarizer(text: string): string {
  if (!text) return "No content to summarize.";
  return `DUMMY SUMMARY: ${text.slice(0, 100)}...`;
}

function feedbackSummarizer(text: string): string {
  if (!text) return "No content to summarize.";
  return `DUMMY SUMMARY: ${text.slice(0, 100)}...`;
}

// ------------------------------------------------------------------
// GET /health
// ------------------------------------------------------------------
export const healthCheck = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    await redisClient.ping();
    res.status(200).json({ status: "ok", redis: "connected" });
  } catch (error) {
    log.error("Redis ping failed:", error);
    res
      .status(503)
      .json({ status: "unavailable", error: "Cannot connect to Redis" });
  }
};

// ------------------------------------------------------------------
// GET /proposals/:proposalId/summary
// ------------------------------------------------------------------
export const getProposalSummaryById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { proposalId } = req.params;
    const key = `proposal_summary:${proposalId}`;

    const summaryData = await redisClient.get(key);

    if (!summaryData) {
      res.status(404).json({ error: "Proposal summary not found." });
    }

    const proposalSummary: ProposalSummary = JSON.parse(summaryData);
    res.status(200).json(proposalSummary);
  } catch (error) {
    log.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
};

/**
 * POST /proposals
 * Creates a new proposal, stores it in Redis, and associates
 * the new proposal ID with the relevant funding round.
 *
 * Expects body like:
 * {
 *   "proposalId": "1234",
 *   "proposalName": "My Proposal",
 *   "proposalDescription": "Proposal details here...",
 *   "proposalAuthor": "Alice",
 *   "endTime": "2025-12-31T23:59:59.999Z",
 *   "fundingRoundId": 123
 * }
 */
export const postProposal = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const {
      proposalId,
      proposalName,
      proposalDescription,
      proposalAuthor,
      endTime,
      fundingRoundId,
    } = req.body;

    if (
      !proposalId ||
      !proposalName ||
      !proposalDescription ||
      !proposalAuthor ||
      !endTime ||
      !fundingRoundId
    ) {
      res.status(400).json({
        error:
          "Required fields: proposalName, proposalDescription, proposalAuthor, endTime, and fundingRoundId.",
      });
    }

    const newProposal: GovbotProposal = {
      proposalId,
      proposalName,
      proposalDescription,
      proposalAuthor,
      endTime: new Date(endTime),
      fundingRoundId,
    };

    const proposalKey = `proposal:${proposalId}`;
    await redisClient.set(proposalKey, JSON.stringify(newProposal));

    const fundingRoundKey = `funding_round_proposals:${fundingRoundId}`;
    const existingProposalsData = await redisClient.get(fundingRoundKey);
    const proposalIds = existingProposalsData
      ? JSON.parse(existingProposalsData)
      : [];
    proposalIds.push(proposalId);

    await redisClient.set(fundingRoundKey, JSON.stringify(proposalIds));

    res.status(201).json(newProposal);
  } catch (error) {
    log.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ------------------------------------------------------------------
// POST /proposals/:proposalId/summary
// Summarizes the proposal and stores the summary
// ------------------------------------------------------------------
export const summarizeProposal = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { proposalId } = req.params;

    const proposalKey = `proposal:${proposalId}`;
    const proposalData = await redisClient.get(proposalKey);
    if (!proposalData) {
      res.status(404).json({ error: "Proposal not found." });
    }

    const proposal: GovbotProposal = JSON.parse(proposalData);

    const summaryText = proposalSummarizer(proposal.proposalDescription);

    const proposalSummary: ProposalSummary = {
      proposalId: proposal.proposalId,
      proposalSummary: summaryText,
      fundingRoundId: proposal.fundingRoundId,
    };

    const summaryKey = `proposal_summary:${proposalId}`;
    await redisClient.set(summaryKey, JSON.stringify(proposalSummary));

    res.status(201).json(proposalSummary);
  } catch (error) {
    log.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ------------------------------------------------------------------
// POST /proposals/:proposalId/feedbacks
// Adds a feedback entry for a given proposal
// ------------------------------------------------------------------
export const postFeedback = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { proposalId } = req.params;

    const proposalKey = `proposal:${proposalId}`;
    const proposalData = await redisClient.get(proposalKey);
    if (!proposalData) {
      res.status(404).json({ error: "Proposal not found." });
    }

    const { username, feedbackContent } = req.body;
    if (!username || !feedbackContent) {
      res.status(400).json({ error: "Missing username or feedbackContent." });
    }

    const feedback: ProposalFeedback = {
      proposalId,
      username,
      feedbackContent,
    };

    const feedbackKey = `proposal_feedbacks:${proposalId}`;
    const existingFeedbackData = await redisClient.get(feedbackKey);
    const feedbacks: ProposalFeedback[] = existingFeedbackData
      ? JSON.parse(existingFeedbackData)
      : [];

    feedbacks.push(feedback);
    await redisClient.set(feedbackKey, JSON.stringify(feedbacks));

    res.status(201).json(feedback);
  } catch (error) {
    log.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ------------------------------------------------------------------
// POST /proposals/:proposalId/feedbacks/summary
// Summarizes all feedback for the proposal
// ------------------------------------------------------------------
export const summarizeFeedbacks = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { proposalId } = req.params;
    const feedbackKey = `proposal_feedbacks:${proposalId}`;

    const feedbackData = await redisClient.get(feedbackKey);
    if (!feedbackData) {
      res.status(404).json({ error: "No feedbacks found for this proposal." });
    }

    const feedbacks: ProposalFeedback[] = JSON.parse(feedbackData);

    // TODO: makes this AI process friendly :D
    // Combine all feedback text into one string
    const combinedText = feedbacks.map((f) => f.feedbackContent).join("\n");

    const summaryText = feedbackSummarizer(combinedText);

    const feedbacksSummary: ProposalFeedbacksSummary = {
      proposalId: parseInt(proposalId, 10),
      feedbackSummary: summaryText,
    };

    const summaryKey = `proposal_feedbacks_summary:${proposalId}`;
    await redisClient.set(summaryKey, JSON.stringify(feedbacksSummary));

    res.status(201).json(feedbacksSummary);
  } catch (error) {
    log.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ------------------------------------------------------------------
// GET /proposals/:proposalId/feedbacks/summary
// Retrieves the summary of feedback for a proposal
// ------------------------------------------------------------------
export const getProposalsFeedbacksSummaryById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { proposalId } = req.params;
    const key = `proposal_feedbacks_summary:${proposalId}`;

    const summaryData = await redisClient.get(key);
    if (!summaryData) {
      res.status(404).json({ error: "Feedback summary not found." });
    }

    const feedbacksSummary: ProposalFeedbacksSummary = JSON.parse(summaryData);
    res.status(200).json(feedbacksSummary);
  } catch (error) {
    log.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
};

// ------------------------------------------------------------------
// GET /funding-rounds/:fundingRoundId/proposals/summaries
// Retrieves summaries of all proposals within a specific funding round
// ------------------------------------------------------------------
export const getProposalsSummariesInFundingRound = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { fundingRoundId } = req.params;
    // This key should map to a list or set of proposal IDs
    const fundingRoundKey = `funding_round_proposals:${fundingRoundId}`;

    const proposalIdsData = await redisClient.get(fundingRoundKey);
    if (!proposalIdsData) {
      res
        .status(404)
        .json({ error: "No proposals found for this funding round." });
    }

    const proposalIds: number[] = JSON.parse(proposalIdsData);
    const summaries: ProposalSummary[] = [];

    for (const pid of proposalIds) {
      const summaryData = await redisClient.get(`proposal_summary:${pid}`);
      if (summaryData) {
        const summary: ProposalSummary = JSON.parse(summaryData);
        summaries.push(summary);
      }
    }

    res.status(200).json(summaries);
  } catch (error) {
    log.error(error);
    res.status(500).json({ error: "Internal server error." });
  }
};
