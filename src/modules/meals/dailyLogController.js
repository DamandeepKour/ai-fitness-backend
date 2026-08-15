import { addDailyLogService, getDailySummaryService } from "./dailyLogService.js";
import { isValidYmd, serverCalendarYmd } from "../../utils/localDate.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { AUDIT_ACTIONS, logAction } from "../../utils/auditLog.js";
import { isQueueEnabled } from "../../jobs/connection.js";
import { enqueueStreakJob } from "../../jobs/queues.js";
import { getStreakService } from "../users/streakService.js";

export const addDailyLog = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const logDate = isValidYmd(req.body.log_date) ? req.body.log_date : serverCalendarYmd();
  const startedAt = Date.now();

  const payload = {
    user_id: userId,
    ...req.body,
    log_date: logDate,
  };

  try {
    const result = await addDailyLogService(payload);
    const latencyMs = Date.now() - startedAt;

    logAction({
      action: AUDIT_ACTIONS.MEAL_LOG_CREATE,
      status: "success",
      req,
      userId,
      latencyMs,
      meta: {
        logId: result.id,
        mealType: result.meal_type || payload.meal_type,
        logDate: payload.log_date,
        inserted: Boolean(result.inserted),
      },
    });

    if (isQueueEnabled()) {
      void enqueueStreakJob({ userId, asOfDate: logDate }).catch(() => {});
    }

    res.json({
      success: true,
      message: result.inserted ? "Meal logged" : "Meal saved",
      data: {
        id: result.id,
        meal_type: result.meal_type || payload.meal_type,
        food_name: payload.food_name,
        calories: payload.calories,
        protein: payload.protein,
        carbs: payload.carbs,
        fat: payload.fat,
        log_date: payload.log_date,
      },
    });
  } catch (err) {
    logAction({
      action: AUDIT_ACTIONS.MEAL_LOG_CREATE,
      status: "error",
      req,
      userId,
      latencyMs: Date.now() - startedAt,
      message: err.message,
      meta: { mealType: payload.meal_type, logDate: payload.log_date },
    });
    throw err;
  }
});

export const getDailySummary = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const logDate = isValidYmd(req.query.date) ? req.query.date : serverCalendarYmd();

  const result = await getDailySummaryService(userId, logDate);

  res.json({ success: true, data: result });
});

export const getStreak = asyncHandler(async (req, res) => {
  const data = await getStreakService(req.user.id);
  res.json({ success: true, data });
});
