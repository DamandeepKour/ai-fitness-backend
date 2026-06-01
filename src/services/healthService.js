import db from "../config/db.js";

const REASON_META = [
  {
    key: "adherence",
    title: "Low plan adherence",
    severity: "destructive",
    hint: "Following < 60% of suggested meals",
  },
  {
    key: "logging",
    title: "Inconsistent logging",
    severity: "destructive",
    hint: "Logged ≤ 3 days in last 7",
  },
  {
    key: "calories",
    title: "Calorie overshoot",
    severity: "warning",
    hint: "Avg >15% above target",
  },
  {
    key: "protein",
    title: "Low protein intake",
    severity: "warning",
    hint: "Below 1g per kg body weight",
  },
  {
    key: "breakfast",
    title: "Skipped breakfasts",
    severity: "warning",
    hint: "≥4 breakfast skips per week",
  },
  {
    key: "timeline",
    title: "Unrealistic timeline",
    severity: "destructive",
    hint: "Targets >1.5kg/week loss",
  },
];

function pct(n, d) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

function estimateCalorieTarget(userWeight, planCalories) {
  if (planCalories) return Number(planCalories);
  if (userWeight) return Math.round(Number(userWeight) * 24);
  return 2000;
}

function diagnoseUser(user, logs, weights, planCalories) {
  const reasons = [];
  const logDays = Number(logs?.log_days_7 || 0);
  const breakfastDays = Number(logs?.breakfast_days_7 || 0);
  const avgCalories = Number(logs?.avg_calories || 0);
  const avgProtein = Number(logs?.avg_protein || 0);
  const targetCalories = estimateCalorieTarget(user.weight, planCalories);

  if (logDays <= 3) reasons.push("logging");
  if (logDays < 4) reasons.push("adherence");
  if (avgCalories > targetCalories * 1.15) reasons.push("calories");
  if (user.weight && avgProtein > 0 && avgProtein < Number(user.weight)) reasons.push("protein");
  if (7 - breakfastDays >= 4) reasons.push("breakfast");

  const firstWeight = weights?.first_weight != null ? Number(weights.first_weight) : null;
  const lastWeight = weights?.last_weight != null ? Number(weights.last_weight) : null;
  const firstDate = weights?.first_log ? new Date(weights.first_log) : null;
  const lastDate = weights?.last_log ? new Date(weights.last_log) : null;

  let weeks = 0;
  let lossKg = 0;
  if (firstWeight != null && lastWeight != null && firstDate && lastDate) {
    weeks = Math.max(1, Math.round((lastDate - firstDate) / (7 * 24 * 60 * 60 * 1000)));
    lossKg = Number((lastWeight - firstWeight).toFixed(1));
    const weeklyLoss = weeks ? Math.abs(lossKg) / weeks : 0;
    if (weeks >= 4 && lossKg > -0.5) reasons.push("timeline");
    if (weeklyLoss > 1.5 && lossKg < 0) reasons.push("timeline");
  }

  const stagnant = weeks >= 4 && lossKg > -0.5;

  return { reasons, weeks, lossKg, stagnant };
}

export async function getHealthAnalyticsService() {
  const conn = await db();

  const [[activeRow]] = await conn.query(
    `SELECT COUNT(*) AS total
     FROM users
     WHERE (user_type = 'user' OR user_type IS NULL)
       AND last_updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
  );
  const totalActive = Number(activeRow.total || 0);

  const [users] = await conn.query(
    `SELECT id, name, weight, goal
     FROM users
     WHERE (user_type = 'user' OR user_type IS NULL)
       AND goal IN ('fat_loss', 'weight_loss')
       AND last_updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
  );

  const [logStats] = await conn.query(
    `SELECT
      user_id,
      COUNT(DISTINCT log_date) AS log_days_7,
      AVG(calories) AS avg_calories,
      AVG(protein) AS avg_protein,
      COUNT(DISTINCT CASE WHEN meal_type = 'breakfast' THEN log_date END) AS breakfast_days_7
     FROM daily_logs
     WHERE log_date >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)
     GROUP BY user_id`,
  );

  const [weightStats] = await conn.query(
    `SELECT
      w.user_id,
      MIN(w.log_date) AS first_log,
      MAX(w.log_date) AS last_log,
      (
        SELECT wl.weight FROM weight_logs wl
        WHERE wl.user_id = w.user_id
        ORDER BY wl.log_date ASC LIMIT 1
      ) AS first_weight,
      (
        SELECT wl.weight FROM weight_logs wl
        WHERE wl.user_id = w.user_id
        ORDER BY wl.log_date DESC LIMIT 1
      ) AS last_weight
     FROM weight_logs w
     GROUP BY w.user_id`,
  );

  const [planStats] = await conn.query(
    `SELECT p.user_id, p.calories
     FROM plans p
     INNER JOIN (
       SELECT user_id, MAX(id) AS max_id
       FROM plans
       GROUP BY user_id
     ) latest ON latest.max_id = p.id`,
  );

  const logMap = Object.fromEntries(logStats.map((r) => [r.user_id, r]));
  const weightMap = Object.fromEntries(weightStats.map((r) => [r.user_id, r]));
  const planMap = Object.fromEntries(planStats.map((r) => [r.user_id, r.calories]));

  const reasonCounts = Object.fromEntries(REASON_META.map((r) => [r.key, 0]));
  const stagnantUsers = [];
  let totalReasons = 0;

  for (const user of users) {
    const diagnosis = diagnoseUser(
      user,
      logMap[user.id],
      weightMap[user.id],
      planMap[user.id],
    );

    if (!diagnosis.stagnant && diagnosis.weeks < 4 && diagnosis.reasons.length === 0) {
      continue;
    }

    const isStagnant =
      diagnosis.stagnant ||
      (diagnosis.weeks >= 4 && diagnosis.lossKg > -0.5) ||
      diagnosis.reasons.length >= 2;

    if (!isStagnant) continue;

    for (const key of diagnosis.reasons) {
      if (reasonCounts[key] != null) reasonCounts[key] += 1;
    }
    totalReasons += diagnosis.reasons.length;

    stagnantUsers.push({
      id: user.id,
      name: user.name,
      weeks: diagnosis.weeks || 4,
      lossKg: diagnosis.lossKg,
      reasons: diagnosis.reasons,
    });
  }

  stagnantUsers.sort((a, b) => b.weeks - a.weeks);

  const stagnant = stagnantUsers.length || 0;
  const stagnantPct = pct(stagnant, totalActive);
  const avgRootCauses = stagnant ? Number((totalReasons / stagnant).toFixed(1)) : 0;

  const reasons = REASON_META.map((meta) => ({
    ...meta,
    affected: reasonCounts[meta.key] || 0,
  })).sort((a, b) => b.affected - a.affected);

  const topCause = reasons[0] || { title: "—", affected: 0 };
  const calorieAffected = reasonCounts.calories || 0;
  const calorieOvershootRate = pct(calorieAffected, stagnant || 1);

  return {
    stagnant,
    totalActive,
    stagnantPct,
    avgRootCauses,
    topCause: {
      title: topCause.title,
      affected: topCause.affected,
    },
    calorieOvershootRate,
    reasons,
    stagnantUsers: stagnantUsers.slice(0, 50),
  };
}

export { REASON_META };
