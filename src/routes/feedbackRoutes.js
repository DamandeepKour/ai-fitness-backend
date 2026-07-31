import express from "express";
import { getAIFeedback } from "../Controllers/feedbackController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { aiLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.get("/feedback", authMiddleware, aiLimiter, getAIFeedback);

export default router;