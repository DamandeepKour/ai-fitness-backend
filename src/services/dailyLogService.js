import { saveDailyLog, getDailyLogs } from "../repositories/dailyLogRepo.js";
import { getUserPlan } from "../repositories/planRepo.js";

const DAILY_LOG_MEAL_TYPES = new Set([
  "morning_drink",
  "breakfast",
  "mid_morning_snack",
  "lunch",
  "evening_snack",
  "dinner",
  "after_dinner",
]);

const MEAL_TYPE_ALIASES = {
  snack: "evening_snack",
  snacks: "evening_snack",
  morning_drink: "morning_drink",
  early_morning_drink: "morning_drink",
  mid_morning_snack: "mid_morning_snack",
  mid_morning: "mid_morning_snack",
  evening_snack: "evening_snack",
  after_dinner: "after_dinner",
  after_dinner_drink: "after_dinner",
  cheat_meal: "dinner",
};

const normalizeMealType = (mealType = "") => {
  const normalized = String(mealType).trim().toLowerCase().replace(/[\s-]+/g, "_");
  const canonical = MEAL_TYPE_ALIASES[normalized] || normalized;

  if (DAILY_LOG_MEAL_TYPES.has(canonical)) {
    return canonical;
  }

  const error = new Error(`Unsupported meal type: ${mealType}`);
  error.statusCode = 400;
  throw error;
};

export const addDailyLogService = async (data) => {
  const meal_type = normalizeMealType(data.meal_type);
  const result = await saveDailyLog({ ...data, meal_type });

  return {
    ...result,
    meal_type,
  };
};

export const getDailySummaryService = async (userId, logDate) => {
  const logs = await getDailyLogs(userId, logDate);

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

