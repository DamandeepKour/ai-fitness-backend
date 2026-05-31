import db from "../config/db.js";

function isFilled(column) {
  return `${column} IS NOT NULL AND TRIM(${column}) <> ''`;
}

function toCountMap(rows, key) {
  return rows.reduce((acc, row) => {
    const name = row[key] || "unknown";
    acc[name] = Number(row.total || 0);
    return acc;
  }, {});
}

export async function getSuperadminAnalyticsService() {
  const conn = await db();

  const [[totalRow]] = await conn.query("SELECT COUNT(*) AS totalSignups FROM users");

  const [[activeRow]] = await conn.query(
    `SELECT COUNT(*) AS activeUsers
     FROM users
     WHERE last_updated_at IS NOT NULL
       AND last_updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
  );

  const [[onboardingRow]] = await conn.query(
    `SELECT COUNT(*) AS onboardingCompleted
     FROM users
     WHERE ${isFilled("mobile_number")}
       AND ${isFilled("country_code")}
       AND age IS NOT NULL
       AND ${isFilled("gender")}
       AND height IS NOT NULL
       AND weight IS NOT NULL
       AND ${isFilled("goal")}
       AND ${isFilled("diet_type")}
       AND ${isFilled("activity_level")}`,
  );

  const [goalRows] = await conn.query(
    `SELECT goal, COUNT(*) AS total
     FROM users
     WHERE goal IS NOT NULL AND TRIM(goal) <> ''
     GROUP BY goal`,
  );

  const [regionRows] = await conn.query(
    `SELECT country_code, COUNT(*) AS total
     FROM users
     WHERE country_code IS NOT NULL AND TRIM(country_code) <> ''
     GROUP BY country_code`,
  );

  const [languageRows] = await conn.query(
    `SELECT language, COUNT(*) AS total
     FROM users
     WHERE language IS NOT NULL AND TRIM(language) <> ''
     GROUP BY language`,
  );

  return {
    totalSignups: Number(totalRow.totalSignups || 0),
    activeUsers: Number(activeRow.activeUsers || 0),
    onboardingCompleted: Number(onboardingRow.onboardingCompleted || 0),
    goalSplit: toCountMap(goalRows, "goal"),
    regionPreference: toCountMap(regionRows, "country_code"),
    languagePreference: toCountMap(languageRows, "language"),
  };
}

export async function getSuperadminUsersService() {
  const conn = await db();
  const [rows] = await conn.query(
    `SELECT id, name, email, user_type, created_at, last_updated_at
     FROM users
     ORDER BY id DESC`,
  );

  return rows.map((row) => ({
    ...row,
    last_login: row.last_updated_at || row.created_at,
    is_active: Boolean(
      row.last_updated_at &&
        new Date(row.last_updated_at).getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000,
    ),
  }));
}

export async function getSuperadminUserByIdService(userId) {
  const conn = await db();
  const [rows] = await conn.query(
    `SELECT
      id, name, email, user_type, mobile_number, country_code, language, age, gender,
      height, weight, goal, diet_type, activity_level, created_at, last_updated_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId],
  );

  if (!rows[0]) return null;

  const row = rows[0];
  return {
    ...row,
    last_login: row.last_updated_at || row.created_at,
    is_active: Boolean(
      row.last_updated_at &&
        new Date(row.last_updated_at).getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000,
    ),
  };
}

export async function getCompleteProfileUsersService() {
  const conn = await db();
  const [rows] = await conn.query(
    `SELECT
      id, name, email, user_type, mobile_number, country_code, age, gender,
      height, weight, goal, diet_type, activity_level, created_at, last_updated_at
     FROM users
     WHERE ${isFilled("name")}
       AND ${isFilled("email")}
       AND ${isFilled("mobile_number")}
       AND ${isFilled("country_code")}
       AND age IS NOT NULL
       AND ${isFilled("gender")}
       AND height IS NOT NULL
       AND weight IS NOT NULL
       AND ${isFilled("goal")}
       AND ${isFilled("diet_type")}
       AND ${isFilled("activity_level")}
     ORDER BY last_updated_at DESC, id DESC`,
  );

  return rows;
}

function parseJsonField(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function titleCaseGoal(value) {
  if (!value) return "Plan";
  return String(value).replace(/_/g, " ");
}

function summarizeDietPlan(dietPlan) {
  const plan = parseJsonField(dietPlan);
  if (!Array.isArray(plan) || plan.length === 0) return "No meals";

  const day = plan[0];
  const meals = day?.meals || day;
  if (!meals || typeof meals !== "object") return "Meal plan";

  const parts = [];
  for (const [key, meal] of Object.entries(meals)) {
    if (key === "cheat_meal") continue;
    const food = meal?.food || (typeof meal === "string" ? meal : null);
    if (food) {
      parts.push(`${key.replace(/_/g, " ")}: ${food}`);
    }
  }

  return parts.slice(0, 4).join(" · ") || "Meal plan";
}

function countMealsInPlan(dietPlan) {
  const plan = parseJsonField(dietPlan);
  if (!Array.isArray(plan)) return 0;

  return plan.reduce((total, day) => {
    const meals = day?.meals || day;
    if (!meals || typeof meals !== "object") return total;
    const count = Object.entries(meals).filter(([key, meal]) => {
      if (key === "cheat_meal") return false;
      return Boolean(meal?.food || (typeof meal === "string" && meal));
    }).length;
    return total + count;
  }, 0);
}

export async function getAIAnalyticsService() {
  const conn = await db();

  const [[stats]] = await conn.query(
    `SELECT
      COUNT(*) AS totalGenerated,
      COUNT(DISTINCT user_id) AS uniqueUsers,
      SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS last30Days
     FROM plans`,
  );

  const totalGenerated = Number(stats.totalGenerated || 0);
  const uniqueUsers = Number(stats.uniqueUsers || 0);
  const regenerated = Math.max(totalGenerated - uniqueUsers, 0);
  const regenRate = totalGenerated ? Math.round((regenerated / totalGenerated) * 100) : 0;

  const [goalRows] = await conn.query(
    `SELECT goal, COUNT(*) AS total
     FROM plans
     WHERE goal IS NOT NULL AND TRIM(goal) <> ''
     GROUP BY goal
     ORDER BY total DESC`,
  );

  return {
    totalGenerated,
    last30Days: Number(stats.last30Days || 0),
    uniqueUsers,
    regenerated,
    regenRate,
    goalSplit: goalRows.map((row) => ({
      label: titleCaseGoal(row.goal),
      count: Number(row.total || 0),
    })),
  };
}

export async function getAIGeneratedMealsService(limit = 50) {
  const conn = await db();
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);

  const [rows] = await conn.query(
    `SELECT
      p.id,
      p.user_id,
      p.goal,
      p.calories,
      p.diet_plan,
      p.workout_plan,
      p.created_at,
      u.name AS user_name,
      u.email AS user_email,
      (
        SELECT COUNT(*)
        FROM plans p2
        WHERE p2.user_id = p.user_id AND p2.id <= p.id
      ) AS plan_index
     FROM plans p
     LEFT JOIN users u ON u.id = p.user_id
     ORDER BY p.created_at DESC
     LIMIT ?`,
    [safeLimit],
  );

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    user: row.user_name || "Unknown user",
    email: row.user_email || "—",
    action: Number(row.plan_index) > 1 ? "Regenerated" : "Generated",
    plan: `${titleCaseGoal(row.goal)} · ${row.calories || 0}kcal`,
    goal: row.goal,
    calories: row.calories,
    mealsSummary: summarizeDietPlan(row.diet_plan),
    mealCount: countMealsInPlan(row.diet_plan),
    dietPlan: parseJsonField(row.diet_plan),
    workoutPlan: parseJsonField(row.workout_plan),
    createdAt: row.created_at,
  }));
}

function parseJsonField(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function titleCaseGoal(value) {
  if (!value) return "Plan";
  return String(value).replace(/_/g, " ");
}

function summarizeDietPlan(dietPlan) {
  const plan = parseJsonField(dietPlan);
  if (!Array.isArray(plan) || plan.length === 0) return "No meals";

  const day = plan[0];
  const meals = day?.meals || day;
  if (!meals || typeof meals !== "object") return "Meal plan";

  const parts = [];
  for (const [key, meal] of Object.entries(meals)) {
    if (key === "cheat_meal") continue;
    const food = meal?.food || (typeof meal === "string" ? meal : null);
    if (food) {
      parts.push(`${key.replace(/_/g, " ")}: ${food}`);
    }
  }

  return parts.slice(0, 4).join(" · ") || "Meal plan";
}

function countMealsInPlan(dietPlan) {
  const plan = parseJsonField(dietPlan);
  if (!Array.isArray(plan)) return 0;

  return plan.reduce((total, day) => {
    const meals = day?.meals || day;
    if (!meals || typeof meals !== "object") return total;
    const count = Object.entries(meals).filter(([key, meal]) => {
      if (key === "cheat_meal") return false;
      return Boolean(meal?.food || (typeof meal === "string" && meal));
    }).length;
    return total + count;
  }, 0);
}

export async function getAIAnalyticsService() {
  const conn = await db();

  const [[stats]] = await conn.query(
    `SELECT
      COUNT(*) AS totalGenerated,
      COUNT(DISTINCT user_id) AS uniqueUsers,
      SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS last30Days
     FROM plans`,
  );

  const totalGenerated = Number(stats.totalGenerated || 0);
  const uniqueUsers = Number(stats.uniqueUsers || 0);
  const regenerated = Math.max(totalGenerated - uniqueUsers, 0);
  const regenRate = totalGenerated ? Math.round((regenerated / totalGenerated) * 100) : 0;

  const [goalRows] = await conn.query(
    `SELECT goal, COUNT(*) AS total
     FROM plans
     WHERE goal IS NOT NULL AND TRIM(goal) <> ''
     GROUP BY goal
     ORDER BY total DESC`,
  );

  return {
    totalGenerated,
    last30Days: Number(stats.last30Days || 0),
    uniqueUsers,
    regenerated,
    regenRate,
    goalSplit: goalRows.map((row) => ({
      label: titleCaseGoal(row.goal),
      count: Number(row.total || 0),
    })),
  };
}

export async function getAIGeneratedMealsService(limit = 50) {
  const conn = await db();
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);

  const [rows] = await conn.query(
    `SELECT
      p.id,
      p.user_id,
      p.goal,
      p.calories,
      p.diet_plan,
      p.workout_plan,
      p.created_at,
      u.name AS user_name,
      u.email AS user_email,
      (
        SELECT COUNT(*)
        FROM plans p2
        WHERE p2.user_id = p.user_id AND p2.id <= p.id
      ) AS plan_index
     FROM plans p
     LEFT JOIN users u ON u.id = p.user_id
     ORDER BY p.created_at DESC
     LIMIT ?`,
    [safeLimit],
  );

  return rows.map((row) => ({
    id: row.id,
    userId: row.user_id,
    user: row.user_name || "Unknown user",
    email: row.user_email || "—",
    action: Number(row.plan_index) > 1 ? "Regenerated" : "Generated",
    plan: `${titleCaseGoal(row.goal)} · ${row.calories || 0}kcal`,
    goal: row.goal,
    calories: row.calories,
    mealsSummary: summarizeDietPlan(row.diet_plan),
    mealCount: countMealsInPlan(row.diet_plan),
    dietPlan: parseJsonField(row.diet_plan),
    workoutPlan: parseJsonField(row.workout_plan),
    createdAt: row.created_at,
  }));
}
