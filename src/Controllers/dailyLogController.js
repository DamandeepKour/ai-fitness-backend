import { addDailyLogService, getDailySummaryService} from "../services/dailyLogService.js";
  
export const addDailyLog = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const payload = {
      user_id: userId,
      ...req.body,
      log_date: new Date().toISOString().split("T")[0],
    };

    const result = await addDailyLogService(payload);

    res.json({
      success: true,
      message: result.updated
        ? "Meal updated for today"
        : "Meal added for today",
      data: {
        meal_type: payload.meal_type,
        food_name: payload.food_name,
        calories: payload.calories,
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
  
      const result = await getDailySummaryService(userId);
  
      res.json({ success: true, data: result });
    } catch (err) {
      next(err);
    }
  };