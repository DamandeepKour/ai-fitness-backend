import express from "express";
import { getAIFeedback } from "./feedbackController.js";
import authMiddleware from "../auth/authMiddleware.js";
import { aiLimiter } from "../../middleware/rateLimiter.js";

const router = express.Router();

router.get("/feedback", authMiddleware, aiLimiter, getAIFeedback);

export default router;