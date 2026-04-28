import express from "express";
import { getAIFeedback } from "../Controllers/feedbackController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get('/feedback', authMiddleware, getAIFeedback);

export default router;