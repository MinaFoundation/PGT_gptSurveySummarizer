import { Router } from "express";
import { hello } from "../controllers/govbotController";

const router: Router = Router();

router.get("/", hello);

export default router;
