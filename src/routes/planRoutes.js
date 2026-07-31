import express from "express";
import { generatePlan } from "../Controllers/planController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { aiPlanLimiter } from "../middleware/rateLimiter.js";
import { validate } from "../middleware/validate.js";
import { aiPlanRequestSchema } from "../validators/aiRequestValidator.js";

const router = express.Router();

router.post("/generate-plan", authMiddleware, aiPlanLimiter, validate(aiPlanRequestSchema), generatePlan);

export default router;