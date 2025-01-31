import { createClient } from "redis";
import { redisConfig } from "@config";

import { Request, Response } from "express";

import {
  GovbotProposal,
  ProposalFeedback,
  ProposalSummary,
  ProposalFeedbacksSummary,
} from "src/models/govbotModel";

import log from "../logger";

const redisClient = createClient(redisConfig);

function proposalSummarizer(text: string): string {
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
  res.status(200).json({ status: "ok" });
};

// ------------------------------------------------------------------
// GET /proposals/:proposalId/summary
// ------------------------------------------------------------------
export const getProposalSummaryById = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    redisClient.on("error", (err) => log.error("Redis Client Error", err));
    await redisClient.connect();
    redisClient.on("connect", () => log.info("Connected to Redis server"));

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

    redisClient.on("error", (err) => log.error("Redis Client Error", err));
    await redisClient.connect();
    redisClient.on("connect", () => log.info("Connected to Redis server"));

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
    redisClient.on("error", (err) => log.error("Redis Client Error", err));
    await redisClient.connect();
    redisClient.on("connect", () => log.info("Connected to Redis server"));

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
