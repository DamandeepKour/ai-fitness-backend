import { saveWeight, getWeeklyWeight } from "../repositories/weightRepo.js";
import { getDailyLogs } from "../repositories/dailyLogRepo.js";

export const addWeightService = async (data) => {
  return await saveWeight(data);
};

export const getWeeklyProgressService = async (userId) => {
    const weightData = await getWeeklyWeight(userId);
  
    const logs = await getDailyLogs(userId);
  
    let calories = 0;
    logs.forEach(l => calories += l.calories);
  
    return {
      weight_trend: weightData,
      weekly_calories: calories,
    };
  };