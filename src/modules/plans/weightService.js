import { saveWeight, getWeeklyWeight, getLatestWeight, getWeightHistoryForDays } from "./weightRepo.js";
import { getDailyLogs } from "../meals/dailyLogRepo.js";
import { serverCalendarYmd } from "../../utils/localDate.js";

const PLATEAU_WINDOW_DAYS = 35;
const PLATEAU_MIN_WEEKS = 4;
const PLATEAU_CHANGE_THRESHOLD_KG = 0.5;

/**
 * Detects a weight plateau: little/no net change over several weeks.
 * Distinct from short-term fluctuation, which needs a longer window to rule out.
 */
export function detectPlateau(weightHistory = []) {
  if (!Array.isArray(weightHistory) || weightHistory.length < 2) {
    return { isPlateau: false, weeks: 0, changeKg: 0 };
  }

  const first = weightHistory[0];
  const last = weightHistory[weightHistory.length - 1];
  const firstDate = new Date(first.log_date);
  const lastDate = new Date(last.log_date);
  const weeks = Math.max(1, Math.round((lastDate - firstDate) / (7 * 24 * 60 * 60 * 1000)));
  const changeKg = Number((Number(last.weight) - Number(first.weight)).toFixed(1));
  const isPlateau = weeks >= PLATEAU_MIN_WEEKS && Math.abs(changeKg) < PLATEAU_CHANGE_THRESHOLD_KG;

  return { isPlateau, weeks, changeKg };
}

/** Plateau context for a user, based on the last ~5 weeks of weigh-ins. */
export const getPlateauStatusService = async (userId) => {
  const history = await getWeightHistoryForDays(userId, PLATEAU_WINDOW_DAYS);
  return detectPlateau(history);
};

// ✅ ADD / UPDATE WEIGHT
export const addWeightService = async (data) => {
  try {
    const today = serverCalendarYmd();

    const latest = await getLatestWeight(data.user_id);

    if (latest && latest.date === today) {
      await saveWeight({ ...data, date: today });

      return {
        message: "Weight updated for today",
        weight: data.weight,
        date: today,
      };
    }

    await saveWeight({ ...data, date: today });

    return {
      message: "Weight added successfully",
      weight: data.weight,
      date: today,
    };

  } catch (error) {
    console.error("Weight Service Error:", error.message);
    throw error;
  }
};

// ✅ WEEKLY PROGRESS
export const getWeeklyProgressService = async (userId) => {
  const weightData = await getWeeklyWeight(userId);
  const logs = await getDailyLogs(userId, serverCalendarYmd());
  const plateau = await getPlateauStatusService(userId);

  let calories = 0;
  logs.forEach(l => calories += l.calories);

  return {
    weight_trend: weightData,
    weekly_calories: calories,
    plateau,
  };
};