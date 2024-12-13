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

    const endTime = proposal.endTime.toString();

    // CREATE PROPOSAL AS SURVEY
    await redisClient.sAdd("surveys", proposal.proposalName);
    const initialSummaryJSON = JSON.stringify({});
    await redisClient.set(`survey:${proposal.proposalName}:summary`, initialSummaryJSON);
    await redisClient.set(
      `survey:${proposal.proposalName}:executive-summary`,
      initialSummaryJSON,
    );
  
    await redisClient.set(`survey:${proposal.proposalName}:type`, 'proposal');
    await redisClient.set(`survey:${proposal.proposalName}:title`, proposal.proposalName);
    await redisClient.set(`survey:${proposal.proposalName}:description`, proposal.proposalDescription);
    await redisClient.set(`survey:${proposal.proposalName}:username`, proposal.proposalAuthor);
    await redisClient.set(`survey:${proposal.proposalName}:created-at`, Date.now());
    await redisClient.set(`survey:${proposal.proposalName}:last-edit-time`, Date.now());
    await redisClient.set(`survey:${proposal.proposalName}:last-summary-time`, Date.now());
    await redisClient.set(`survey:${proposal.proposalName}:endtime`, endTime);
  
    if (proposal.endTime.getTime() >= Date.now()) {
      await redisClient.set(`survey:${proposal.proposalName}:is-active`, "true");
    } else {
      await redisClient.set(`survey:${proposal.proposalName}:is-active`, "false");
    }

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
