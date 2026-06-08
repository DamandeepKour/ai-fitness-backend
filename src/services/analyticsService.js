import db from "../config/db.js";
import { subscriptionsTable } from "../models/businessModel.js";

function pct(n, d) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

const USER_FILTER = `(user_type = 'user' OR user_type IS NULL)`;

function isFilled(column) {
  return `${column} IS NOT NULL AND TRIM(${column}) <> ''`;
}

export async function getFunnelAnalyticsService() {
  const conn = await db();

  const [[signupRow]] = await conn.query(
    `SELECT COUNT(*) AS total FROM users WHERE ${USER_FILTER}`,
  );
  const signups = Number(signupRow.total || 0);

  const [[onboardingRow]] = await conn.query(
    `SELECT COUNT(*) AS total FROM users
     WHERE ${USER_FILTER}
       AND ${isFilled("mobile_number")}
       AND ${isFilled("country_code")}
       AND age IS NOT NULL
       AND ${isFilled("gender")}
       AND height IS NOT NULL
       AND weight IS NOT NULL
       AND ${isFilled("goal")}
       AND ${isFilled("diet_type")}
       AND ${isFilled("activity_level")}`,
  );
  const onboarding = Number(onboardingRow.total || 0);

  const [[planRow]] = await conn.query(
    `SELECT COUNT(DISTINCT user_id) AS total FROM plans`,
  );
  const planGenerated = Number(planRow.total || 0);

  const [[mealLogRow]] = await conn.query(
    `SELECT COUNT(DISTINCT user_id) AS total FROM daily_logs`,
  );
  const mealLogged = Number(mealLogRow.total || 0);

  const [[paidRow]] = await conn.query(
    `SELECT COUNT(DISTINCT user_id) AS total
     FROM ${subscriptionsTable}
     WHERE status = 'active'`,
  );
  const paid = Number(paidRow.total || 0);

  const [[activeRow]] = await conn.query(
    `SELECT COUNT(*) AS total FROM users
     WHERE ${USER_FILTER}
       AND last_updated_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)`,
  );
  const active = Number(activeRow.total || 0);

  const steps = [
    { key: "signup", label: "Sign up", count: signups, rate: 100 },
    { key: "onboarding", label: "Onboarding complete", count: onboarding, rate: pct(onboarding, signups) },
    { key: "plan", label: "AI plan generated", count: planGenerated, rate: pct(planGenerated, signups) },
    { key: "meal_log", label: "First meal logged", count: mealLogged, rate: pct(mealLogged, signups) },
    { key: "paid", label: "Paid subscription", count: paid, rate: pct(paid, signups) },
    { key: "active", label: "Active (7d)", count: active, rate: pct(active, signups) },
  ];

  const withDropoff = steps.map((step, index) => {
    const prev = index > 0 ? steps[index - 1].count : step.count;
    return {
      ...step,
      dropoff: index > 0 ? pct(prev - step.count, prev) : 0,
      stepConversion: index > 0 ? pct(step.count, prev) : 100,
    };
  });

  return {
    signups,
    steps: withDropoff,
    overallConversion: pct(paid, signups),
    onboardingToPlan: pct(planGenerated, onboarding || signups),
    planToMealLog: pct(mealLogged, planGenerated || signups),
  };
}

export async function getRetentionAnalyticsService() {
  const conn = await db();

  const retentionDays = [1, 3, 7, 14, 30];
  const curve = [];

  for (const day of retentionDays) {
    const [[row]] = await conn.query(
      `SELECT
        COUNT(*) AS cohortSize,
        SUM(
          CASE
            WHEN last_updated_at IS NOT NULL
             AND last_updated_at >= DATE_ADD(created_at, INTERVAL ? DAY)
            THEN 1 ELSE 0
          END
        ) AS retained
       FROM users
       WHERE ${USER_FILTER}
         AND created_at <= DATE_SUB(NOW(), INTERVAL ? DAY)
         AND created_at >= DATE_SUB(NOW(), INTERVAL 90 DAY)`,
      [Math.max(day - 1, 0), day],
    );

    curve.push({
      day,
      label: `Day ${day}`,
      cohortSize: Number(row.cohortSize || 0),
      retained: Number(row.retained || 0),
      rate: pct(Number(row.retained || 0), Number(row.cohortSize || 0)),
    });
  }

  const [[summary7]] = await conn.query(
    `SELECT COUNT(*) AS cohortSize,
      SUM(CASE WHEN last_updated_at IS NOT NULL AND last_updated_at >= DATE_ADD(created_at, INTERVAL 6 DAY) THEN 1 ELSE 0 END) AS retained
     FROM users
     WHERE ${USER_FILTER}
       AND created_at <= DATE_SUB(NOW(), INTERVAL 7 DAY)
       AND created_at >= DATE_SUB(NOW(), INTERVAL 37 DAY)`,
  );

  const [[summary30]] = await conn.query(
    `SELECT COUNT(*) AS cohortSize,
      SUM(CASE WHEN last_updated_at IS NOT NULL AND last_updated_at >= DATE_ADD(created_at, INTERVAL 23 DAY) THEN 1 ELSE 0 END) AS retained
     FROM users
     WHERE ${USER_FILTER}
       AND created_at <= DATE_SUB(NOW(), INTERVAL 30 DAY)
       AND created_at >= DATE_SUB(NOW(), INTERVAL 60 DAY)`,
  );

  return {
    curve,
    day7: pct(Number(summary7.retained || 0), Number(summary7.cohortSize || 0)),
    day30: pct(Number(summary30.retained || 0), Number(summary30.cohortSize || 0)),
    day7CohortSize: Number(summary7.cohortSize || 0),
    day30CohortSize: Number(summary30.cohortSize || 0),
  };
}

export async function getCohortAnalyticsService() {
  const conn = await db();

  const [cohortRows] = await conn.query(
    `SELECT
      DATE_FORMAT(created_at, '%Y-%W') AS cohortKey,
      DATE(DATE_SUB(created_at, INTERVAL WEEKDAY(created_at) DAY)) AS cohortStart,
      COUNT(*) AS cohortSize
     FROM users
     WHERE ${USER_FILTER}
       AND created_at >= DATE_SUB(NOW(), INTERVAL 56 DAY)
     GROUP BY cohortKey, cohortStart
     ORDER BY cohortStart DESC
     LIMIT 8`,
  );

  const cohorts = [];

  for (const row of cohortRows) {
    const cohortStart = row.cohortStart;
    const cohortSize = Number(row.cohortSize || 0);

    const [[retention]] = await conn.query(
      `SELECT
        SUM(CASE WHEN last_updated_at >= DATE_ADD(created_at, INTERVAL 6 DAY) THEN 1 ELSE 0 END) AS day7,
        SUM(CASE WHEN last_updated_at >= DATE_ADD(created_at, INTERVAL 13 DAY) THEN 1 ELSE 0 END) AS day14,
        SUM(CASE WHEN last_updated_at >= DATE_ADD(created_at, INTERVAL 29 DAY) THEN 1 ELSE 0 END) AS day30
       FROM users
       WHERE ${USER_FILTER}
         AND DATE(DATE_SUB(created_at, INTERVAL WEEKDAY(created_at) DAY)) = ?`,
      [cohortStart],
    );

    const startDate = new Date(cohortStart);
    const label = startDate.toLocaleDateString(undefined, { month: "short", day: "numeric" });

    cohorts.push({
      key: row.cohortKey,
      label: `Week of ${label}`,
      cohortStart,
      cohortSize,
      day7: pct(Number(retention.day7 || 0), cohortSize),
      day14: pct(Number(retention.day14 || 0), cohortSize),
      day30: pct(Number(retention.day30 || 0), cohortSize),
      retainedDay7: Number(retention.day7 || 0),
      retainedDay14: Number(retention.day14 || 0),
      retainedDay30: Number(retention.day30 || 0),
    });
  }

  const periods = ["day7", "day14", "day30"];
  const averages = Object.fromEntries(
    periods.map((period) => {
      const valid = cohorts.filter((c) => {
        const daysSince = (Date.now() - new Date(c.cohortStart).getTime()) / (1000 * 60 * 60 * 24);
        if (period === "day7") return daysSince >= 7;
        if (period === "day14") return daysSince >= 14;
        return daysSince >= 30;
      });
      const avg = valid.length
        ? Math.round(valid.reduce((acc, c) => acc + c[period], 0) / valid.length)
        : 0;
      return [period, avg];
    }),
  );

  return { cohorts, averages };
}

export async function getAIQualityAnalyticsService() {
  const conn = await db();

  const [[planStats]] = await conn.query(
    `SELECT COUNT(*) AS totalPlans, COUNT(DISTINCT user_id) AS uniqueUsers
     FROM plans`,
  );

  const totalPlans = Number(planStats.totalPlans || 0);
  const uniqueUsers = Number(planStats.uniqueUsers || 0);
  const regenRate = totalPlans ? Math.round(((totalPlans - uniqueUsers) / totalPlans) * 100) : 0;

  const [[adoptionRow]] = await conn.query(
    `SELECT
      COUNT(DISTINCT p.user_id) AS planUsers,
      COUNT(DISTINCT CASE
        WHEN dl.id IS NOT NULL AND dl.log_date >= DATE(p.created_at)
         AND dl.log_date <= DATE_ADD(DATE(p.created_at), INTERVAL 7 DAY)
        THEN p.user_id
      END) AS adoptedUsers
     FROM plans p
     LEFT JOIN daily_logs dl ON dl.user_id = p.user_id
     WHERE p.id IN (
       SELECT MAX(id) FROM plans GROUP BY user_id
     )`,
  );

  const planUsers = Number(adoptionRow.planUsers || 0);
  const adoptedUsers = Number(adoptionRow.adoptedUsers || 0);
  const adoptionRate = pct(adoptedUsers, planUsers);

  const [[mealRow]] = await conn.query(
    `SELECT ROUND(AVG(meal_count)) AS avgMeals
     FROM (
       SELECT p.user_id, COUNT(dl.id) AS meal_count
       FROM plans p
       LEFT JOIN daily_logs dl
         ON dl.user_id = p.user_id
        AND dl.log_date >= DATE(p.created_at)
        AND dl.log_date <= DATE_ADD(DATE(p.created_at), INTERVAL 7 DAY)
       WHERE p.id IN (SELECT MAX(id) FROM plans GROUP BY user_id)
       GROUP BY p.user_id, p.id
     ) t`,
  );

  const avgMealsAfterPlan = Number(mealRow.avgMeals || 0);
  const qualityScore = Math.min(
    100,
    Math.round(adoptionRate * 0.5 + (100 - regenRate) * 0.3 + Math.min(avgMealsAfterPlan * 5, 20)),
  );

  const feedbackBuckets = [
    { label: "5 — Loved it", rating: 5, count: 0 },
    { label: "4 — Good", rating: 4, count: 0 },
    { label: "3 — Okay", rating: 3, count: 0 },
    { label: "2 — Meh", rating: 2, count: 0 },
    { label: "1 — Bad", rating: 1, count: 0 },
  ];

  return {
    qualityScore,
    adoptionRate,
    regenRate,
    avgMealsAfterPlan,
    planUsers,
    adoptedUsers,
    feedbackBuckets,
    feedbackTotal: 0,
    hasExplicitRatings: false,
    signals: [
      { label: "Plan adoption (7d)", value: adoptionRate, suffix: "%", tone: adoptionRate >= 50 ? "success" : "warning" },
      { label: "Regeneration rate", value: regenRate, suffix: "%", tone: regenRate <= 25 ? "success" : "destructive" },
      { label: "Avg meals logged post-plan", value: avgMealsAfterPlan, suffix: "", tone: avgMealsAfterPlan >= 5 ? "success" : "warning" },
    ],
  };
}
