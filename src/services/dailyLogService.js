import { saveDailyLog, getDailyLogs } from "../repositories/dailyLogRepo.js";
import { getUserPlan } from "../repositories/planRepo.js";

export const addDailyLogService = async (data) => {
  return await saveDailyLog(data);
};

export const getDailySummaryService = async (userId) => {
  const logs = await getDailyLogs(userId);

  const userPlan = await getUserPlan(userId);
  const targetCalories = userPlan?.calories || 2000;

  let totalCalories = 0,
    protein = 0,
    carbs = 0,
    fat = 0;

  logs.forEach((item) => {
    totalCalories += item.calories;
    protein += item.protein;
    carbs += item.carbs;
    fat += item.fat;
  });

  return {
    total_calories: totalCalories,
    remaining_calories: targetCalories - totalCalories,
    protein,
    carbs,
    fat,
    meals: logs,
  };
};

