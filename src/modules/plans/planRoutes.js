import express from "express";
import { generatePlan, generatePlanAsync, explainPlan } from "./planController.js";
import authMiddleware from "../auth/authMiddleware.js";
import { aiPlanLimiter, aiLimiter } from "../../middleware/rateLimiter.js";
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
router.get("/explain", authMiddleware, aiLimiter, explainPlan);

export default router;