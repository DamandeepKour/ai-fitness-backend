// src/services/dashboardService.js

import { getDailyLogs, getDailyLogsForLastDays } from "../repositories/dailyLogRepo.js";
import { getUserPlan } from "../repositories/planRepo.js";
import { getLatestWeight, getRecentWeights } from "../repositories/weightRepo.js";
import { getUserByIdService } from "./userService.js";

const toNumber = (value) => Number(value || 0);

const formatDateKey = (date) => {
  const d = new Date(date);
  return d.toISOString().split("T")[0];
};

const parseJson = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const buildLast7DaysCalories = (logs) => {
  const totalsByDate = new Map();

  logs.forEach((log) => {
    const key = formatDateKey(log.log_date);
    totalsByDate.set(key, (totalsByDate.get(key) || 0) + toNumber(log.calories));
  });

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - (6 - index));
    const key = formatDateKey(date);

    return {
      date: key,
      d: date.toLocaleDateString("en-US", { weekday: "short" }),
      kcal: totalsByDate.get(key) || 0,
    };
  });
};

const flattenDietPlan = (dietPlan) => {
  if (!Array.isArray(dietPlan)) return [];

  return dietPlan.flatMap((day) => {
    const meals = day?.meals && typeof day.meals === "object" ? day.meals : {};

    return Object.entries(meals)
      .filter(([, meal]) => meal?.food)
      .map(([mealType, meal]) => ({
        day: day.day,
        meal_type: mealType,
        food_name: meal.food,
        calories: toNumber(meal.calories),
      }));
  });
};

const getDashboardService = async (userId) => {
  try {
    const logs = await getDailyLogs(userId);
    const last7DaysLogs = await getDailyLogsForLastDays(userId, 7);
    const plan = await getUserPlan(userId);
    const weight = await getLatestWeight(userId);
    const weightHistory = await getRecentWeights(userId, 6);
    const user = await getUserByIdService(userId);

    const totals = logs.reduce(
      (acc, log) => ({
        calories: acc.calories + toNumber(log.calories),
        protein: acc.protein + toNumber(log.protein),
        carbs: acc.carbs + toNumber(log.carbs),
        fat: acc.fat + toNumber(log.fat),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0 }
    );

    const targetCalories = plan?.calories || 2000;
    const currentWeight = weight?.weight || user?.weight || null;
    const proteinTarget = currentWeight ? Math.round(toNumber(currentWeight) * 1.6) : 140;
    const carbsTarget = Math.round((targetCalories * 0.45) / 4);
    const fatTarget = Math.round((targetCalories * 0.25) / 9);
    const dietPlan = parseJson(plan?.diet_plan, []);

    return {
      user: {
        id: user?.id,
        name: user?.name,
        email: user?.email,
      },
      today: {
        consumed_calories: totals.calories,
        remaining_calories: Math.max(targetCalories - totals.calories, 0),
        macros: {
          protein: totals.protein,
          carbs: totals.carbs,
          fat: totals.fat,
        },
      },
      targets: {
        calories: targetCalories,
        protein: proteinTarget,
        carbs: carbsTarget,
        fat: fatTarget,
      },
      weight: currentWeight,
      weight_log_date: weight?.log_date || null,
      weight_history: weightHistory.map((item, index) => ({
        label: `W${index + 1}`,
        weight: toNumber(item.weight),
        log_date: item.log_date,
      })),
      plan: {
        goal: plan?.goal,
        calories: targetCalories,
        diet_plan: dietPlan,
        workout_plan: parseJson(plan?.workout_plan, []),
      },
      generated_meals: flattenDietPlan(dietPlan),
      graph: buildLast7DaysCalories(last7DaysLogs),
      meals: logs,
    };
  } catch (err) {
    throw err;
  }
};

export default getDashboardService;