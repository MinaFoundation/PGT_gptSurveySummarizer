import { createClient } from "redis";
import {
  GovbotProposal,
  ProposalFeedback,
  ProposalSummary,
  ProposalFeedbacksSummary,
} from "src/models/govbotModel";

import log from "../logger";
