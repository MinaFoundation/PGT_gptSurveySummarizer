import { Request, Response } from "express";
import { isMeaningful } from "@lib/isMeaningful";
import { redisConfig } from "@config";
import { createClient } from "redis";
import { Deliberation, Proposal } from "src/models/govbotModel";

import log from "../logger";

export const hello = (req: Request, res: Response): void => {
  res.json({ message: "Hello Govbot!" });
};

export const consumeProposal = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const redisClient = createClient(redisConfig);

  try {
    redisClient.on("error", (err) => log.error("Redis Client Error", err));
    await redisClient.connect();
    redisClient.on("connect", () => log.info("Connected to Redis server"));

    const proposal: Proposal = req.body;

    if (
      !proposal ||
      !proposal.proposalName ||
      !proposal.proposalDescription ||
      !proposal.proposalAuthor
    ) {
      res.status(400).json({ error: "Invalid deliberation data." });
      return;
    }

    // CREATE PROPOSAL AS SURVEY
    

  } catch (error) {
    log.error("Error processing deliberation", error);
    res.status(500).json({ error: "Internal server error." });
  } finally {
    await redisClient.disconnect();
  }
};

export const consumeDeliberation = async (
  req: Request,
  res: Response,
): Promise<void> => {
  const redisClient = createClient(redisConfig);

  try {
    redisClient.on("error", (err) => log.error("Redis Client Error", err));
    await redisClient.connect();
    redisClient.on("connect", () => log.info("Connected to Redis server"));

    const deliberation: Deliberation = req.body;

    if (
      !deliberation ||
      !deliberation.proposalName ||
      !deliberation.username ||
      !deliberation.feedbackContent
    ) {
      res.status(400).json({ error: "Invalid deliberation data." });
      return;
    }

    const isFeedbackMeaningful = await isMeaningful(
      deliberation.feedbackContent,
    );

    if (!isFeedbackMeaningful) {
      res.status(400).json({ error: "Feedback is not meaningful." });
      return;
    }

    const redisKey = `deliberation:${deliberation.proposalName}:${deliberation.username}`;
    const redisValue = JSON.stringify({
      feedbackContent: deliberation.feedbackContent,
      timestamp: new Date().toISOString(),
    });

    await redisClient.set(redisKey, redisValue);

    // DB PROCESS AS SURVEY
    await redisClient.hSet(
      `survey:${deliberation.proposalName}:responses`,
      deliberation.username,
      deliberation.feedbackContent,
    );
    await redisClient.set(
      `survey:${deliberation.proposalName}:last-edit-time`,
      Date.now(),
    );
    await redisClient.publish("survey-refresh", deliberation.proposalName);

    res.status(200).json({ message: "Deliberation saved successfully." });
  } catch (error) {
    log.error("Error processing deliberation", error);
    res.status(500).json({ error: "Internal server error." });
  } finally {
    await redisClient.disconnect();
  }
};
