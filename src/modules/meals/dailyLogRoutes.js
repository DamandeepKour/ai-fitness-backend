import express from "express";
import {
  addDailyLog,
  getDailySummary,
  getStreak,
} from "./dailyLogController.js";
import authMiddleware from "../auth/authMiddleware.js";
import { validate } from "../../middleware/validate.js";
import { addDailyLogSchema, dailySummaryQuerySchema } from "./dailyLogValidator.js";

const router = express.Router();

router.post("/add", authMiddleware, validate(addDailyLogSchema), addDailyLog);
router.get("/summary", authMiddleware, validate(dailySummaryQuerySchema, "query"), getDailySummary);
router.get("/streak", authMiddleware, getStreak);

export default router;