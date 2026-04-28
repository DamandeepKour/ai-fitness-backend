import express from "express";
import { getWeeklyProgress } from "../Controllers/progressController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get('/weekly', authMiddleware, getWeeklyProgress);

export default router;
