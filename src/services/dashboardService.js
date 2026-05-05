// src/services/dashboardService.js

import { getDailyLogs } from "../repositories/dailyLogRepo.js";
import { getUserPlan } from "../repositories/planRepo.js";
import { getLatestWeight } from "../repositories/weightRepo.js";

const getDashboardService = async (userId) => {
  try {
    const logs = await getDailyLogs(userId);
    const plan = await getUserPlan(userId);
    const weight = await getLatestWeight(userId);

    let totalCalories = 0;

    logs.forEach((l) => (totalCalories += l.calories));

    const targetCalories = plan?.calories || 2000;

    return {
      today: {
        consumed_calories: totalCalories,
        remaining_calories: targetCalories - totalCalories,
      },
      weight: weight?.weight || null,
      plan: {
        goal: plan?.goal,
        calories: targetCalories,
      },
      meals: logs,
    };
  } catch (err) {
    throw err;
  }
};

export default getDashboardService;