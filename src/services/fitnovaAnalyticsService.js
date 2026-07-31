import { isMongoReady } from "../config/mongo.js";
import { logger } from "../config/logger.js";
import db from "../config/db.js";
import AnalyticsEvent, { ANALYTICS_EVENT_TYPES } from "../models/mongo/analyticsEvent.js";
import AiAuditLog from "../models/mongo/aiAuditLog.js";

const DEFAULT_DAYS = 30;
const MAX_DAYS = 90;

function parseDateRange(query = {}) {
  const now = new Date();
  let to = query.to ? new Date(query.to) : now;
  let from;

  if (Number.isNaN(to.getTime())) {
    const err = new Error("Invalid date range. Use days=1-90 or from/to ISO dates.");
    err.statusCode = 400;
    throw err;
  }

  // Normalize `to` to end of UTC day when only a date was implied.
  if (query.to && !String(query.to).includes("T")) {
    to = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate(), 23, 59, 59, 999));
  }

  if (query.from) {
    from = new Date(query.from);
    if (!String(query.from).includes("T")) {
      from = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate(), 0, 0, 0, 0));
    }
  } else {
    const days = Math.min(MAX_DAYS, Math.max(1, Number(query.days) || DEFAULT_DAYS));
    from = new Date(Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate(), 0, 0, 0, 0));
    from.setUTCDate(from.getUTCDate() - (days - 1));
  }

  if (Number.isNaN(from.getTime()) || from > to) {
    const err = new Error("Invalid date range. Use days=1-90 or from/to ISO dates.");
    err.statusCode = 400;
    throw err;
  }

  const startDay = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  const endDay = Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate());
  const days = Math.min(
    MAX_DAYS,
    Math.max(1, Math.round((endDay - startDay) / (24 * 60 * 60 * 1000)) + 1),
  );

  return { from, to, days };
}

function fillDailySeries(from, to, rows, valueKey = "count") {
  const map = new Map(rows.map((r) => [r.day, Number(r[valueKey] || 0)]));
  const series = [];
  const cursor = new Date(from);
  cursor.setUTCHours(0, 0, 0, 0);
  const end = new Date(to);
  end.setUTCHours(0, 0, 0, 0);

  while (cursor <= end) {
    const day = cursor.toISOString().slice(0, 10);
    series.push({ day, count: map.get(day) || 0 });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return series;
}

function createdAtMatch(from, to) {
  return { createdAt: { $gte: from, $lte: to } };
}

/* -------------------- Mongo aggregations -------------------- */

async function aggregateDailyActiveUsers(from, to) {
  const rows = await AnalyticsEvent.aggregate([
    {
      $match: {
        ...createdAtMatch(from, to),
        userId: { $ne: null },
        status: { $in: ["success", "ok"] },
        eventType: {
          $in: [
            ANALYTICS_EVENT_TYPES.USER_ACTIVITY,
            ANALYTICS_EVENT_TYPES.LOGIN,
            ANALYTICS_EVENT_TYPES.MEAL_LOG_CREATE,
            ANALYTICS_EVENT_TYPES.PLAN_GENERATION,
            ANALYTICS_EVENT_TYPES.DIET_PLAN_GENERATION,
            ANALYTICS_EVENT_TYPES.WORKOUT_PLAN_GENERATION,
          ],
        },
      },
    },
    {
      $group: {
        _id: { day: "$day", userId: "$userId" },
      },
    },
    {
      $group: {
        _id: "$_id.day",
        count: { $sum: 1 },
      },
    },
    { $project: { _id: 0, day: "$_id", count: 1 } },
    { $sort: { day: 1 } },
  ]);

  const series = fillDailySeries(from, to, rows);
  const totalActiveUserDays = series.reduce((sum, d) => sum + d.count, 0);
  const peak = series.reduce((max, d) => Math.max(max, d.count), 0);
  const avg = series.length ? Math.round((totalActiveUserDays / series.length) * 10) / 10 : 0;

  const uniqueUsers = await AnalyticsEvent.aggregate([
    {
      $match: {
        ...createdAtMatch(from, to),
        userId: { $ne: null },
        status: { $in: ["success", "ok"] },
      },
    },
    { $group: { _id: "$userId" } },
    { $count: "total" },
  ]);

  return {
    series,
    averageDailyActiveUsers: avg,
    peakDailyActiveUsers: peak,
    uniqueActiveUsers: uniqueUsers[0]?.total || 0,
  };
}

async function aggregateNewSignups(from, to) {
  const rows = await AnalyticsEvent.aggregate([
    {
      $match: {
        ...createdAtMatch(from, to),
        eventType: ANALYTICS_EVENT_TYPES.SIGNUP,
        status: "success",
      },
    },
    {
      $group: {
        _id: "$day",
        count: { $sum: 1 },
      },
    },
    { $project: { _id: 0, day: "$_id", count: 1 } },
    { $sort: { day: 1 } },
  ]);

  const series = fillDailySeries(from, to, rows);
  return {
    total: series.reduce((sum, d) => sum + d.count, 0),
    series,
  };
}

async function aggregatePlanGenerations(from, to) {
  const rows = await AnalyticsEvent.aggregate([
    {
      $match: {
        ...createdAtMatch(from, to),
        eventType: {
          $in: [
            ANALYTICS_EVENT_TYPES.PLAN_GENERATION,
            ANALYTICS_EVENT_TYPES.DIET_PLAN_GENERATION,
          ],
        },
        status: "success",
      },
    },
    {
      $group: {
        _id: {
          day: "$day",
          // Prefer counting one plan gen per request when both diet+workout logged
          requestId: { $ifNull: ["$requestId", "$_id"] },
        },
      },
    },
    {
      $group: {
        _id: "$_id.day",
        count: { $sum: 1 },
      },
    },
    { $project: { _id: 0, day: "$_id", count: 1 } },
    { $sort: { day: 1 } },
  ]);

  const series = fillDailySeries(from, to, rows);

  const uniqueUsers = await AnalyticsEvent.aggregate([
    {
      $match: {
        ...createdAtMatch(from, to),
        eventType: {
          $in: [
            ANALYTICS_EVENT_TYPES.PLAN_GENERATION,
            ANALYTICS_EVENT_TYPES.DIET_PLAN_GENERATION,
          ],
        },
        status: "success",
        userId: { $ne: null },
      },
    },
    { $group: { _id: "$userId" } },
    { $count: "total" },
  ]);

  return {
    total: series.reduce((sum, d) => sum + d.count, 0),
    uniqueUsers: uniqueUsers[0]?.total || 0,
    series,
  };
}

async function aggregateMealCompletion(from, to) {
  const [result] = await AnalyticsEvent.aggregate([
    {
      $match: {
        ...createdAtMatch(from, to),
        userId: { $ne: null },
        status: "success",
        eventType: {
          $in: [
            ANALYTICS_EVENT_TYPES.USER_ACTIVITY,
            ANALYTICS_EVENT_TYPES.LOGIN,
            ANALYTICS_EVENT_TYPES.MEAL_LOG_CREATE,
            ANALYTICS_EVENT_TYPES.PLAN_GENERATION,
            ANALYTICS_EVENT_TYPES.DIET_PLAN_GENERATION,
          ],
        },
      },
    },
    {
      $group: {
        _id: { day: "$day", userId: "$userId" },
        loggedMeal: {
          $max: {
            $cond: [
              { $eq: ["$eventType", ANALYTICS_EVENT_TYPES.MEAL_LOG_CREATE] },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $group: {
        _id: null,
        activeUserDays: { $sum: 1 },
        completedUserDays: { $sum: "$loggedMeal" },
      },
    },
  ]);

  const activeUserDays = result?.activeUserDays || 0;
  const completedUserDays = result?.completedUserDays || 0;
  const rate = activeUserDays
    ? Math.round((completedUserDays / activeUserDays) * 1000) / 10
    : 0;

  const daily = await AnalyticsEvent.aggregate([
    {
      $match: {
        ...createdAtMatch(from, to),
        userId: { $ne: null },
        status: "success",
        eventType: {
          $in: [
            ANALYTICS_EVENT_TYPES.USER_ACTIVITY,
            ANALYTICS_EVENT_TYPES.LOGIN,
            ANALYTICS_EVENT_TYPES.MEAL_LOG_CREATE,
            ANALYTICS_EVENT_TYPES.PLAN_GENERATION,
            ANALYTICS_EVENT_TYPES.DIET_PLAN_GENERATION,
          ],
        },
      },
    },
    {
      $group: {
        _id: { day: "$day", userId: "$userId" },
        loggedMeal: {
          $max: {
            $cond: [
              { $eq: ["$eventType", ANALYTICS_EVENT_TYPES.MEAL_LOG_CREATE] },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $group: {
        _id: "$_id.day",
        activeUserDays: { $sum: 1 },
        completedUserDays: { $sum: "$loggedMeal" },
      },
    },
    {
      $project: {
        _id: 0,
        day: "$_id",
        activeUserDays: 1,
        completedUserDays: 1,
        rate: {
          $cond: [
            { $gt: ["$activeUserDays", 0] },
            {
              $round: [
                { $multiply: [{ $divide: ["$completedUserDays", "$activeUserDays"] }, 100] },
                1,
              ],
            },
            0,
          ],
        },
      },
    },
    { $sort: { day: 1 } },
  ]);

  return {
    rate,
    activeUserDays,
    completedUserDays,
    series: daily,
  };
}

async function aggregateGoalDistribution(from, to) {
  const rows = await AnalyticsEvent.aggregate([
    {
      $match: {
        ...createdAtMatch(from, to),
        status: "success",
        goal: { $nin: [null, ""] },
        eventType: {
          $in: [
            ANALYTICS_EVENT_TYPES.PLAN_GENERATION,
            ANALYTICS_EVENT_TYPES.DIET_PLAN_GENERATION,
            ANALYTICS_EVENT_TYPES.SIGNUP,
          ],
        },
      },
    },
    {
      $group: {
        _id: "$goal",
        count: { $sum: 1 },
      },
    },
    { $project: { _id: 0, goal: "$_id", count: 1 } },
    { $sort: { count: -1 } },
  ]);

  const total = rows.reduce((sum, r) => sum + r.count, 0);
  return {
    total,
    distribution: rows.map((r) => ({
      goal: r.goal,
      count: r.count,
      percent: total ? Math.round((r.count / total) * 1000) / 10 : 0,
    })),
  };
}

async function aggregateAiUsage(from, to) {
  const [summary] = await AiAuditLog.aggregate([
    { $match: createdAtMatch(from, to) },
    {
      $group: {
        _id: null,
        totalCalls: { $sum: 1 },
        successCalls: {
          $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] },
        },
        fallbackCalls: {
          $sum: { $cond: [{ $eq: ["$status", "fallback"] }, 1, 0] },
        },
        errorCalls: {
          $sum: { $cond: [{ $eq: ["$status", "error"] }, 1, 0] },
        },
        avgLatencyMs: { $avg: "$latencyMs" },
        promptTokens: { $sum: { $ifNull: ["$promptTokens", 0] } },
        completionTokens: { $sum: { $ifNull: ["$completionTokens", 0] } },
        uniqueUsers: { $addToSet: "$userId" },
      },
    },
    {
      $project: {
        _id: 0,
        totalCalls: 1,
        successCalls: 1,
        fallbackCalls: 1,
        errorCalls: 1,
        avgLatencyMs: { $round: [{ $ifNull: ["$avgLatencyMs", 0] }, 0] },
        promptTokens: 1,
        completionTokens: 1,
        uniqueUsers: {
          $size: {
            $filter: {
              input: "$uniqueUsers",
              as: "u",
              cond: { $ne: ["$$u", null] },
            },
          },
        },
      },
    },
  ]);

  const byFeature = await AiAuditLog.aggregate([
    { $match: createdAtMatch(from, to) },
    {
      $group: {
        _id: "$feature",
        count: { $sum: 1 },
        success: { $sum: { $cond: [{ $eq: ["$status", "success"] }, 1, 0] } },
        fallback: { $sum: { $cond: [{ $eq: ["$status", "fallback"] }, 1, 0] } },
        error: { $sum: { $cond: [{ $eq: ["$status", "error"] }, 1, 0] } },
        avgLatencyMs: { $avg: "$latencyMs" },
      },
    },
    {
      $project: {
        _id: 0,
        feature: "$_id",
        count: 1,
        success: 1,
        fallback: 1,
        error: 1,
        avgLatencyMs: { $round: [{ $ifNull: ["$avgLatencyMs", 0] }, 0] },
      },
    },
    { $sort: { count: -1 } },
  ]);

  const byDay = await AiAuditLog.aggregate([
    { $match: createdAtMatch(from, to) },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$createdAt" },
        },
        count: { $sum: 1 },
        errors: { $sum: { $cond: [{ $eq: ["$status", "error"] }, 1, 0] } },
      },
    },
    { $project: { _id: 0, day: "$_id", count: 1, errors: 1 } },
    { $sort: { day: 1 } },
  ]);

  const empty = {
    totalCalls: 0,
    successCalls: 0,
    fallbackCalls: 0,
    errorCalls: 0,
    avgLatencyMs: 0,
    promptTokens: 0,
    completionTokens: 0,
    uniqueUsers: 0,
  };

  return {
    ...(summary || empty),
    byFeature,
    series: fillDailySeries(from, to, byDay),
  };
}

async function getMongoOverview(from, to, days) {
  const [dailyActiveUsers, newSignups, planGenerations, mealLogCompletion, goalDistribution, aiUsage] =
    await Promise.all([
      aggregateDailyActiveUsers(from, to),
      aggregateNewSignups(from, to),
      aggregatePlanGenerations(from, to),
      aggregateMealCompletion(from, to),
      aggregateGoalDistribution(from, to),
      aggregateAiUsage(from, to),
    ]);

  return {
    source: "mongodb",
    range: { from: from.toISOString(), to: to.toISOString(), days },
    dailyActiveUsers,
    newSignups,
    planGenerations,
    mealLogCompletion,
    goalDistribution,
    aiUsage,
  };
}

/* -------------------- MySQL fallback -------------------- */

async function getMysqlOverview(from, to, days) {
  const conn = await db();
  const fromSql = from.toISOString().slice(0, 19).replace("T", " ");
  const toSql = to.toISOString().slice(0, 19).replace("T", " ");

  const [dauRows] = await conn.query(
    `SELECT DATE(created_at) AS day, COUNT(DISTINCT user_id) AS count
     FROM api_request_logs
     WHERE created_at BETWEEN ? AND ?
       AND user_id IS NOT NULL
     GROUP BY DATE(created_at)
     ORDER BY day ASC`,
    [fromSql, toSql],
  );

  const [[dauUnique]] = await conn.query(
    `SELECT COUNT(DISTINCT user_id) AS total
     FROM api_request_logs
     WHERE created_at BETWEEN ? AND ?
       AND user_id IS NOT NULL`,
    [fromSql, toSql],
  );

  const [signupRows] = await conn.query(
    `SELECT DATE(created_at) AS day, COUNT(*) AS count
     FROM users
     WHERE created_at BETWEEN ? AND ?
     GROUP BY DATE(created_at)
     ORDER BY day ASC`,
    [fromSql, toSql],
  );

  const [planRows] = await conn.query(
    `SELECT DATE(created_at) AS day, COUNT(*) AS count
     FROM plans
     WHERE created_at BETWEEN ? AND ?
     GROUP BY DATE(created_at)
     ORDER BY day ASC`,
    [fromSql, toSql],
  );

  const [[planUsers]] = await conn.query(
    `SELECT COUNT(DISTINCT user_id) AS total
     FROM plans
     WHERE created_at BETWEEN ? AND ?`,
    [fromSql, toSql],
  );

  const [[mealStats]] = await conn.query(
    `SELECT
       (SELECT COUNT(*) FROM (
          SELECT DISTINCT user_id, log_date FROM daily_logs
          WHERE log_date BETWEEN DATE(?) AND DATE(?)
        ) meal_days) AS completedUserDays,
       (SELECT COUNT(*) FROM (
          SELECT DISTINCT user_id, DATE(created_at) AS d FROM api_request_logs
          WHERE created_at BETWEEN ? AND ? AND user_id IS NOT NULL
        ) active_days) AS activeUserDays`,
    [fromSql, toSql, fromSql, toSql],
  );

  const [goalRows] = await conn.query(
    `SELECT goal, COUNT(*) AS count
     FROM plans
     WHERE created_at BETWEEN ? AND ?
       AND goal IS NOT NULL AND TRIM(goal) <> ''
     GROUP BY goal
     ORDER BY count DESC`,
    [fromSql, toSql],
  );

  const [aiRows] = await conn.query(
    `SELECT DATE(created_at) AS day, COUNT(*) AS count,
            SUM(status = 'error') AS errors
     FROM ai_request_logs
     WHERE created_at BETWEEN ? AND ?
     GROUP BY DATE(created_at)
     ORDER BY day ASC`,
    [fromSql, toSql],
  );

  const [[aiSummary]] = await conn.query(
    `SELECT
       COUNT(*) AS totalCalls,
       SUM(status = 'success') AS successCalls,
       SUM(status = 'fallback') AS fallbackCalls,
       SUM(status = 'error') AS errorCalls,
       ROUND(AVG(latency_ms)) AS avgLatencyMs,
       COALESCE(SUM(prompt_tokens), 0) AS promptTokens,
       COALESCE(SUM(completion_tokens), 0) AS completionTokens,
       COUNT(DISTINCT user_id) AS uniqueUsers
     FROM ai_request_logs
     WHERE created_at BETWEEN ? AND ?`,
    [fromSql, toSql],
  );

  const [aiFeatureRows] = await conn.query(
    `SELECT feature,
            COUNT(*) AS count,
            SUM(status = 'success') AS success,
            SUM(status = 'fallback') AS fallback,
            SUM(status = 'error') AS error,
            ROUND(AVG(latency_ms)) AS avgLatencyMs
     FROM ai_request_logs
     WHERE created_at BETWEEN ? AND ?
     GROUP BY feature
     ORDER BY count DESC`,
    [fromSql, toSql],
  );

  const toDay = (row) => {
    const raw = row.day;
    if (raw instanceof Date) return raw.toISOString().slice(0, 10);
    return String(raw).slice(0, 10);
  };

  const dauSeries = fillDailySeries(
    from,
    to,
    dauRows.map((r) => ({ day: toDay(r), count: Number(r.count) })),
  );
  const signupSeries = fillDailySeries(
    from,
    to,
    signupRows.map((r) => ({ day: toDay(r), count: Number(r.count) })),
  );
  const planSeries = fillDailySeries(
    from,
    to,
    planRows.map((r) => ({ day: toDay(r), count: Number(r.count) })),
  );
  const aiSeries = fillDailySeries(
    from,
    to,
    aiRows.map((r) => ({ day: toDay(r), count: Number(r.count) })),
  );

  const activeUserDays = Number(mealStats?.activeUserDays || 0);
  const completedUserDays = Number(mealStats?.completedUserDays || 0);
  const mealRate = activeUserDays
    ? Math.round((completedUserDays / activeUserDays) * 1000) / 10
    : 0;

  const goalTotal = goalRows.reduce((sum, r) => sum + Number(r.count || 0), 0);

  return {
    source: "mysql",
    range: { from: from.toISOString(), to: to.toISOString(), days },
    dailyActiveUsers: {
      series: dauSeries,
      averageDailyActiveUsers: dauSeries.length
        ? Math.round(
          (dauSeries.reduce((s, d) => s + d.count, 0) / dauSeries.length) * 10,
        ) / 10
        : 0,
      peakDailyActiveUsers: dauSeries.reduce((m, d) => Math.max(m, d.count), 0),
      uniqueActiveUsers: Number(dauUnique?.total || 0),
    },
    newSignups: {
      total: signupSeries.reduce((s, d) => s + d.count, 0),
      series: signupSeries,
    },
    planGenerations: {
      total: planSeries.reduce((s, d) => s + d.count, 0),
      uniqueUsers: Number(planUsers?.total || 0),
      series: planSeries,
    },
    mealLogCompletion: {
      rate: mealRate,
      activeUserDays,
      completedUserDays,
      series: [],
    },
    goalDistribution: {
      total: goalTotal,
      distribution: goalRows.map((r) => ({
        goal: r.goal,
        count: Number(r.count),
        percent: goalTotal ? Math.round((Number(r.count) / goalTotal) * 1000) / 10 : 0,
      })),
    },
    aiUsage: {
      totalCalls: Number(aiSummary?.totalCalls || 0),
      successCalls: Number(aiSummary?.successCalls || 0),
      fallbackCalls: Number(aiSummary?.fallbackCalls || 0),
      errorCalls: Number(aiSummary?.errorCalls || 0),
      avgLatencyMs: Number(aiSummary?.avgLatencyMs || 0),
      promptTokens: Number(aiSummary?.promptTokens || 0),
      completionTokens: Number(aiSummary?.completionTokens || 0),
      uniqueUsers: Number(aiSummary?.uniqueUsers || 0),
      byFeature: aiFeatureRows.map((r) => ({
        feature: r.feature,
        count: Number(r.count),
        success: Number(r.success || 0),
        fallback: Number(r.fallback || 0),
        error: Number(r.error || 0),
        avgLatencyMs: Number(r.avgLatencyMs || 0),
      })),
      series: aiSeries,
    },
  };
}

/**
 * FitNova admin analytics overview.
 * Prefers MongoDB aggregation pipelines; falls back to MySQL when Mongo is unavailable.
 */
export async function getFitnovaAnalyticsOverviewService(query = {}) {
  const { from, to, days } = parseDateRange(query);

  if (isMongoReady()) {
    try {
      return await getMongoOverview(from, to, days);
    } catch (err) {
      logger.error(
        { type: "analytics", err: err.message },
        "Mongo analytics aggregation failed — falling back to MySQL",
      );
    }
  }

  return getMysqlOverview(from, to, days);
}

export async function getFitnovaAiUsageService(query = {}) {
  const { from, to, days } = parseDateRange(query);

  if (isMongoReady()) {
    try {
      const aiUsage = await aggregateAiUsage(from, to);
      return {
        source: "mongodb",
        range: { from: from.toISOString(), to: to.toISOString(), days },
        ...aiUsage,
      };
    } catch (err) {
      logger.error({ type: "analytics", err: err.message }, "Mongo AI usage aggregation failed");
    }
  }

  const overview = await getMysqlOverview(from, to, days);
  return {
    source: "mysql",
    range: overview.range,
    ...overview.aiUsage,
  };
}

export async function getFitnovaMetricService(metric, query = {}) {
  const overview = await getFitnovaAnalyticsOverviewService(query);
  const map = {
    dau: "dailyActiveUsers",
    "daily-active-users": "dailyActiveUsers",
    signups: "newSignups",
    plans: "planGenerations",
    "meal-completion": "mealLogCompletion",
    goals: "goalDistribution",
    "ai-usage": "aiUsage",
  };

  const key = map[metric];
  if (!key) {
    const err = new Error(`Unknown metric: ${metric}`);
    err.statusCode = 404;
    throw err;
  }

  return {
    source: overview.source,
    range: overview.range,
    metric: key,
    data: overview[key],
  };
}

export { parseDateRange };
