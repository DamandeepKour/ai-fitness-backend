// src/services/dashboardService.js

import { getDailyLogs, getDailyLogsForLastDays } from "../repositories/dailyLogRepo.js";
import { getUserPlan } from "../repositories/planRepo.js";
import { getLatestWeight, getRecentWeights } from "../repositories/weightRepo.js";
import { getUserByIdService } from "./userService.js";
import { isValidYmd, serverCalendarYmd } from "../utils/localDate.js";

const toNumber = (value) => Number(value || 0);

const emptyNutritionTotals = () => ({ calories: 0, protein: 0, carbs: 0, fat: 0 });

const formatDateKey = (logDate) => {
  if (logDate == null) return "";
  if (typeof logDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(logDate)) {
    return logDate.slice(0, 10);
  }
  const d = new Date(logDate);
  if (Number.isNaN(d.getTime())) return "";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const shiftDateYmd = (ymd, days) => {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
};

const sumNutritionTotals = (logs) => logs.reduce(
  (acc, log) => ({
    calories: acc.calories + toNumber(log.calories),
    protein: acc.protein + toNumber(log.protein),
    carbs: acc.carbs + toNumber(log.carbs),
    fat: acc.fat + toNumber(log.fat),
  }),
  emptyNutritionTotals()
);

const parseJson = (value, fallback) => {
  if (!value) return fallback;
  if (typeof value !== "string") return value;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const MEAL_SEQUENCE = [
  "morning_drink",
  "breakfast",
  "mid_morning_snack",
  "lunch",
  "evening_snack",
  "dinner",
  "after_dinner",
  "cheat_meal",
];

const buildLast7DaysCalories = (logs, endYmd) => {
  const totalsByDate = new Map();

  logs.forEach((log) => {
    const key = formatDateKey(log.log_date);
    if (!key) return;
    totalsByDate.set(key, (totalsByDate.get(key) || 0) + toNumber(log.calories));
  });

  const [y, m, d] = endYmd.split("-").map(Number);
  const end = new Date(y, m - 1, d);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(end);
    date.setDate(end.getDate() - (6 - index));
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

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
      .sort(([a], [b]) => {
        const aIndex = MEAL_SEQUENCE.indexOf(a);
        const bIndex = MEAL_SEQUENCE.indexOf(b);
        return (aIndex === -1 ? MEAL_SEQUENCE.length : aIndex) - (bIndex === -1 ? MEAL_SEQUENCE.length : bIndex);
      })
      .map(([mealType, meal]) => ({
        day: day.day,
        meal_type: mealType,
        food_name: meal.food,
        calories: toNumber(meal.calories),
        energy: toNumber(meal.energy || meal.calories),
        protein: toNumber(meal.protein),
        carbs: toNumber(meal.carbs),
        fibre: toNumber(meal.fibre || meal.fiber),
        sugar: toNumber(meal.sugar),
      }));
  });
};

const getDashboardService = async (userId, logDateYmd) => {
  try {
    const logDate = isValidYmd(logDateYmd) ? logDateYmd : serverCalendarYmd();
    const logs = await getDailyLogs(userId, logDate);
    const last7DaysLogs = await getDailyLogsForLastDays(userId, logDate, 7);
    const plan = await getUserPlan(userId);
    const weight = await getLatestWeight(userId);
    const weightHistory = await getRecentWeights(userId, 6);
    const user = await getUserByIdService(userId);

    const totals = sumNutritionTotals(logs);
    const previousLogDate = shiftDateYmd(logDate, -1);
    const previousLogs = last7DaysLogs.filter((log) => formatDateKey(log.log_date) === previousLogDate);
    const previousTotals = sumNutritionTotals(previousLogs);

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
      yesterday: {
        consumed_calories: previousTotals.calories,
        macros: {
          protein: previousTotals.protein,
          carbs: previousTotals.carbs,
          fat: previousTotals.fat,
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
      graph: buildLast7DaysCalories(last7DaysLogs, logDate),
      meals: logs,
    };
  } catch (err) {
    throw err;
  }
};

export default getDashboardService;