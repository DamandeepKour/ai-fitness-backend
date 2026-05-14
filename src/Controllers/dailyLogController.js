import { addDailyLogService, getDailySummaryService} from "../services/dailyLogService.js";
import { isValidYmd, serverCalendarYmd } from "../utils/localDate.js";
  
export const addDailyLog = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const logDate = isValidYmd(req.body.log_date) ? req.body.log_date : serverCalendarYmd();

    const payload = {
      user_id: userId,
      ...req.body,
      log_date: logDate,
    };

    const result = await addDailyLogService(payload);

    res.json({
      success: true,
      message: result.inserted ? "Meal logged" : "Meal saved",
      data: {
        id: result.id,
        meal_type: payload.meal_type,
        food_name: payload.food_name,
        calories: payload.calories,
        protein: payload.protein,
        carbs: payload.carbs,
        fat: payload.fat,
        log_date: payload.log_date,
      },
    });
  } catch (err) {
    next(err);
  }
};
  
  export const getDailySummary = async (req, res, next) => {
    try {
      const userId = req.user.id;
      const logDate = isValidYmd(req.query.date) ? req.query.date : serverCalendarYmd();
  
      const result = await getDailySummaryService(userId, logDate);
  
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };