import { Router } from "express";
import {
  hello,
  consumeProposal,
  consumeDeliberation,
} from "../controllers/govbotController";
import { authMiddleware } from "src/middleware/authMiddleware";

const router: Router = Router();

router.get("/", hello);
router.post("/proposal", authMiddleware, consumeProposal);
router.post("/deliberation", consumeDeliberation);

export default router;
