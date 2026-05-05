import express from "express";
import { generatePlan } from "../Controllers/planController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { aiLimiter } from "../middleware/rateLimiter.js";
import { validate } from "../middleware/validate.js";
import { planSchema } from "../validators/planValidator.js";

const router = express.Router();

router.post("/generate-plan", validate(planSchema), generatePlan);

export default router;