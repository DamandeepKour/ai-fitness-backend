import db from "../config/db.js";

const MEAL_TYPE_LABELS = {
  breakfast: "Breakfast",
  mid_morning_snack: "Snacks",
  lunch: "Lunch",
  dinner: "Dinner",
  evening_snack: "Pre-workout",
};

function toLabel(mealType) {
  return MEAL_TYPE_LABELS[mealType] || mealType || "Other";
}

function pct(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 100);
}

export async function getNutritionAnalyticsService() {
  const conn = await db();

  const [mealRows] = await conn.query(
    `SELECT meal_type, COUNT(*) AS count
     FROM daily_logs
     WHERE log_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
     GROUP BY meal_type
     ORDER BY count DESC`,
  );

  const [skippedRows] = await conn.query(
    `SELECT meal_type, COUNT(*) AS count
     FROM daily_logs
     WHERE log_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       AND calories <= 120
     GROUP BY meal_type
     ORDER BY count DESC`,
  );

  const [foodRows] = await conn.query(
    `SELECT
       food_name AS name,
       COUNT(*) AS logs,
       ROUND(AVG(calories)) AS kcal
     FROM daily_logs
     WHERE log_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       AND food_name IS NOT NULL
       AND TRIM(food_name) <> ''
     GROUP BY food_name
     ORDER BY logs DESC
     LIMIT 6`,
  );

  const [adherenceRows] = await conn.query(
    `SELECT
       DAYOFWEEK(log_date) AS dayIndex,
       ROUND(AVG(
         CASE
           WHEN calories >= 1500 AND calories <= 2300 THEN 1
           WHEN calories >= 1200 AND calories <= 2600 THEN 0.7
           ELSE 0.45
         END
       ) * 100) AS score
     FROM daily_logs
     WHERE log_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
     GROUP BY DAYOFWEEK(log_date)
     ORDER BY dayIndex ASC`,
  );

  const [[kcalRow]] = await conn.query(
    `SELECT
      ROUND(AVG(day_total)) AS avgKcal
     FROM (
       SELECT user_id, log_date, SUM(calories) AS day_total
       FROM daily_logs
       WHERE log_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
       GROUP BY user_id, log_date
     ) t`,
  );

  const mealTypes = mealRows.map((row) => ({
    label: toLabel(row.meal_type),
    count: Number(row.count || 0),
  }));
  const skippedMeals = skippedRows.map((row) => ({
    label: toLabel(row.meal_type),
    count: Number(row.count || 0),
  }));
  const topFoods = foodRows.map((row) => ({
    name: row.name,
    logs: Number(row.logs || 0),
    kcal: Number(row.kcal || 0),
  }));

  const dayMap = { 2: "Mon", 3: "Tue", 4: "Wed", 5: "Thu", 6: "Fri", 7: "Sat", 1: "Sun" };
  const weeklyMap = Object.fromEntries(
    adherenceRows.map((row) => [dayMap[row.dayIndex], Number(row.score || 0)]),
  );
  const weeklyAdherence = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
    day,
    score: weeklyMap[day] ?? 0,
  }));

  const mealTotal = mealTypes.reduce((acc, row) => acc + row.count, 0);
  const skipTotal = skippedMeals.reduce((acc, row) => acc + row.count, 0);
  const avgKcal = Number(kcalRow.avgKcal || 0);
  const targetKcal = 2000;
  const avgAdherence = weeklyAdherence.length
    ? Math.round(weeklyAdherence.reduce((acc, row) => acc + row.score, 0) / weeklyAdherence.length)
    : 0;

  return {
    mealTypes,
    mealTotal,
    skippedMeals,
    skipTotal,
    skipRate: pct(skipTotal, mealTotal),
    topFoods,
    weeklyAdherence,
    avgAdherence,
    avgKcal,
    targetKcal,
    diff: avgKcal - targetKcal,
  };
}
