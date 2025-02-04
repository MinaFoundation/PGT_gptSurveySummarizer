import { Router } from "express";
import {
  hello,
  consumeProposal,
  consumeDeliberation,
} from "../controllers/govbotController";
import { authMiddleware } from "src/middleware/authMiddleware";
import {
  getProposalsFeedbacksSummaryById,
  getProposalsSummariesInFundingRound,
  getProposalSummaryById,
  healthCheck,
  postFeedback,
  postProposal,
  summarizeFeedbacks,
  summarizeProposal,
} from "src/controllers/controllers";

const router: Router = Router();

router.get("/", hello);

// Healtcheck
router.get("/health", healthCheck);

// Proposals
router.get(
  "/proposals/:proposalId/summary",
  authMiddleware,
  getProposalSummaryById,
);
router.post("/proposals", authMiddleware, postProposal);
router.post(
  "/proposals/:proposalId/summarize",
  authMiddleware,
  summarizeProposal,
);

// Feedback for a proposal
router.post("/proposals/:proposalId/feedbacks", authMiddleware, postFeedback);
router.get(
  "/proposals/:proposalId/feedbacks/summary",
  authMiddleware,
  getProposalsFeedbacksSummaryById,
);
router.post(
  "/proposals/:proposalId/feedbacks/summary",
  authMiddleware,
  summarizeFeedbacks,
);

// Funding rounds
router.get(
  "/funding-rounds/:fundingRoundId/proposals/summaries",
  authMiddleware,
  getProposalsSummariesInFundingRound,
);

// For discord
router.post("/proposal", authMiddleware, consumeProposal);
router.post("/deliberation", authMiddleware, consumeDeliberation);

export default router;
