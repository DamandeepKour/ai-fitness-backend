import express from "express";
import {
  addDailyLog,
  getDailySummary,
} from "../Controllers/dailyLogController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/add", authMiddleware, addDailyLog);
router.get("/summary", authMiddleware, getDailySummary);

export default router;