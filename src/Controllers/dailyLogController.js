import {
    addDailyLogService,
    getDailySummaryService,
  } from "../services/dailyLogService.js";
  
  export const addDailyLog = async (req, res, next) => {
    try {
      const userId = req.user.id;
  
      const data = {
        user_id: userId,
        ...req.body,
        log_date: new Date().toISOString().split("T")[0],
      };
  
      const result = await addDailyLogService(data);
  
      res.json({ success: true, message: "Meal added", data: result });
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