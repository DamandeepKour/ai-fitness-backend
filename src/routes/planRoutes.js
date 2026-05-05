import express from "express";
import { generatePlan } from "../Controllers/planController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { aiLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/generate-plan",authMiddleware, aiLimiter, generatePlan);

export default router;