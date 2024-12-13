import { Router } from "express";
import { hello, consumeProposal, consumeDeliberation } from "../controllers/govbotController";

const router: Router = Router();

router.get("/", hello);
router.post("/proposal", consumeProposal);
router.post("/deliberation", consumeDeliberation);

export default router;
