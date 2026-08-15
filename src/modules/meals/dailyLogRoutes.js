import express from "express";
import {
  addDailyLog,
  getDailySummary,
  getStreak,
  explainMeal,
} from "./dailyLogController.js";
import authMiddleware from "../auth/authMiddleware.js";
import { aiLimiter } from "../../middleware/rateLimiter.js";
import { validate } from "../../middleware/validate.js";
import {
  addDailyLogSchema,
  dailySummaryQuerySchema,
  explainMealQuerySchema,
} from "./dailyLogValidator.js";

const router = express.Router();

router.post("/add", authMiddleware, validate(addDailyLogSchema), addDailyLog);
router.get("/summary", authMiddleware, validate(dailySummaryQuerySchema, "query"), getDailySummary);
router.get("/streak", authMiddleware, getStreak);
router.get("/explain", authMiddleware, aiLimiter, validate(explainMealQuerySchema, "query"), explainMeal);

export default router;