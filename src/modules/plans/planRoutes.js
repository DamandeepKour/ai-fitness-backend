import express from "express";
import { generatePlan, generatePlanAsync } from "./planController.js";
import authMiddleware from "../auth/authMiddleware.js";
import { aiPlanLimiter } from "../../middleware/rateLimiter.js";
import { validate } from "../../middleware/validate.js";
import { aiPlanRequestSchema } from "../ai/aiRequestValidator.js";

const router = express.Router();

router.post("/generate-plan", authMiddleware, aiPlanLimiter, validate(aiPlanRequestSchema), generatePlan);
router.post(
  "/generate-plan-async",
  authMiddleware,
  aiPlanLimiter,
  validate(aiPlanRequestSchema),
  generatePlanAsync,
);

export default router;