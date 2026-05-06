import { saveWeight, getWeeklyWeight, getLatestWeight } from "../repositories/weightRepo.js";
import { getDailyLogs } from "../repositories/dailyLogRepo.js";

// ✅ ADD / UPDATE WEIGHT
export const addWeightService = async (data) => {
  try {
    const today = new Date().toISOString().split("T")[0];

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
  const logs = await getDailyLogs(userId);

  let calories = 0;
  logs.forEach(l => calories += l.calories);

  return {
    weight_trend: weightData,
    weekly_calories: calories,
  };
};