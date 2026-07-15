import db from "../config/db.js";
import { trafficLogTable } from "../models/trafficLogModel.js";

function toNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : 0;
}

function pctChange(current, previous) {
  if (!previous) return current > 0 ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

export async function getTrafficSummaryService() {
  const conn = await db();

  const [[todayApi]] = await conn.query(
    `SELECT COUNT(*) AS total, AVG(duration_ms) AS avgMs
     FROM ${trafficLogTable}
     WHERE created_at >= CURDATE()`,
  );

  const [[yesterdayApi]] = await conn.query(
    `SELECT COUNT(*) AS total
     FROM ${trafficLogTable}
     WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 1 DAY)
       AND created_at < CURDATE()`,
  );

  const [[errorsToday]] = await conn.query(
    `SELECT COUNT(*) AS total
     FROM ${trafficLogTable}
     WHERE created_at >= CURDATE() AND status_code >= 400`,
  );

  const [[activeSessions]] = await conn.query(
    `SELECT COUNT(DISTINCT user_id) AS total
     FROM ${trafficLogTable}
     WHERE user_id IS NOT NULL
       AND created_at >= DATE_SUB(NOW(), INTERVAL 15 MINUTE)`,
  );

  const [[userEventsToday]] = await conn.query(
    `SELECT (
       (SELECT COUNT(*) FROM users WHERE created_at >= CURDATE()) +
       (SELECT COUNT(*) FROM daily_logs WHERE created_at >= CURDATE()) +
       (SELECT COUNT(*) FROM weight_logs WHERE created_at >= CURDATE()) +
       (SELECT COUNT(*) FROM plans WHERE created_at >= CURDATE()) +
       (SELECT COUNT(*) FROM user_history WHERE changed_at >= CURDATE())
     ) AS total`,
  );

  const [[userEventsYesterday]] = await conn.query(
    `SELECT (
       (SELECT COUNT(*) FROM users
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND created_at < CURDATE()) +
       (SELECT COUNT(*) FROM daily_logs
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND created_at < CURDATE()) +
       (SELECT COUNT(*) FROM weight_logs
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND created_at < CURDATE()) +
       (SELECT COUNT(*) FROM plans
        WHERE created_at >= DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND created_at < CURDATE()) +
       (SELECT COUNT(*) FROM user_history
        WHERE changed_at >= DATE_SUB(CURDATE(), INTERVAL 1 DAY) AND changed_at < CURDATE())
     ) AS total`,
  );

  const apiToday = toNumber(todayApi.total);
  const apiYesterday = toNumber(yesterdayApi.total);
  const eventsToday = toNumber(userEventsToday.total);
  const eventsYesterday = toNumber(userEventsYesterday.total);
  const errorCount = toNumber(errorsToday.total);

  return {
    eventsToday,
    eventsChangePct: pctChange(eventsToday, eventsYesterday),
    apiRequestsToday: apiToday,
    apiRequestsChangePct: pctChange(apiToday, apiYesterday),
    activeSessions: toNumber(activeSessions.total),
    avgResponseTimeMs: Math.round(toNumber(todayApi.avgMs)),
    errorRatePct: apiToday ? Math.round((errorCount / apiToday) * 100) : 0,
    engagementScore: apiToday
      ? Math.min(100, Math.round((eventsToday / Math.max(apiToday, 1)) * 100))
      : 0,
  };
}

export async function getTrafficLogsService({
  page = 1,
  limit = 50,
  method,
  status,
  path,
}) {
  const conn = await db();
  const safePage = Math.max(1, toNumber(page));
  const safeLimit = Math.min(100, Math.max(1, toNumber(limit)));
  const offset = (safePage - 1) * safeLimit;

  const conditions = ["1=1"];
  const params = [];

  if (method) {
    conditions.push("t.method = ?");
    params.push(String(method).toUpperCase());
  }

  if (status) {
    const code = toNumber(status);
    if (code >= 100) {
      conditions.push("t.status_code = ?");
      params.push(code);
    }
  }

  if (path) {
    conditions.push("t.path LIKE ?");
    params.push(`%${String(path).trim()}%`);
  }

  const where = conditions.join(" AND ");

  const [[countRow]] = await conn.query(
    `SELECT COUNT(*) AS total FROM ${trafficLogTable} t WHERE ${where}`,
    params,
  );

  const [rows] = await conn.query(
    `SELECT
       t.id,
       t.user_id,
       u.name AS user_name,
       u.email AS user_email,
       t.method,
       t.path,
       t.status_code,
       t.duration_ms,
       t.ip,
       t.user_agent,
       t.created_at
     FROM ${trafficLogTable} t
     LEFT JOIN users u ON u.id = t.user_id
     WHERE ${where}
     ORDER BY t.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, safeLimit, offset],
  );

  return {
    logs: rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name || (row.user_id ? `User #${row.user_id}` : "Anonymous"),
      userEmail: row.user_email,
      method: row.method,
      path: row.path,
      statusCode: row.status_code,
      durationMs: row.duration_ms,
      ip: row.ip,
      userAgent: row.user_agent,
      createdAt: row.created_at,
    })),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total: toNumber(countRow.total),
      totalPages: Math.ceil(toNumber(countRow.total) / safeLimit) || 1,
    },
  };
}

export async function getTrafficHistoryService({ hours = 24 } = {}) {
  const conn = await db();
  const safeHours = Math.min(168, Math.max(1, toNumber(hours)));

  const [rows] = await conn.query(
    `SELECT
       DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') AS bucket,
       COUNT(*) AS requests,
       AVG(duration_ms) AS avg_duration_ms,
       SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS errors
     FROM ${trafficLogTable}
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL ? HOUR)
     GROUP BY bucket
     ORDER BY bucket ASC`,
    [safeHours],
  );

  return {
    hours: safeHours,
    buckets: rows.map((row) => ({
      bucket: row.bucket,
      requests: toNumber(row.requests),
      avgDurationMs: Math.round(toNumber(row.avg_duration_ms)),
      errors: toNumber(row.errors),
    })),
  };
}

export async function getUserActivityService({ page = 1, limit = 50 } = {}) {
  const conn = await db();
  const safePage = Math.max(1, toNumber(page));
  const safeLimit = Math.min(100, Math.max(1, toNumber(limit)));
  const offset = (safePage - 1) * safeLimit;
  const fetchLimit = safeLimit + offset;

  const queries = [
    conn.query(
      `SELECT 'signup' AS event_type, u.id AS user_id, u.name AS actor_name,
              u.email AS actor_email, u.created_at AS occurred_at,
              'New signup' AS event_label, NULL AS detail
       FROM users u
       ORDER BY u.created_at DESC
       LIMIT ?`,
      [fetchLimit],
    ),
    conn.query(
      `SELECT 'meal_log' AS event_type, dl.user_id, u.name AS actor_name,
              u.email AS actor_email, dl.created_at AS occurred_at,
              'Meal logged' AS event_label, dl.food_name AS detail
       FROM daily_logs dl
       JOIN users u ON u.id = dl.user_id
       ORDER BY dl.created_at DESC
       LIMIT ?`,
      [fetchLimit],
    ),
    conn.query(
      `SELECT 'weight_update' AS event_type, wl.user_id, u.name AS actor_name,
              u.email AS actor_email, wl.created_at AS occurred_at,
              'Weight update logged' AS event_label,
              CONCAT(wl.weight, ' kg') AS detail
       FROM weight_logs wl
       JOIN users u ON u.id = wl.user_id
       ORDER BY wl.created_at DESC
       LIMIT ?`,
      [fetchLimit],
    ),
    conn.query(
      `SELECT 'plan_generated' AS event_type, p.user_id, u.name AS actor_name,
              u.email AS actor_email, p.created_at AS occurred_at,
              'Meal plan generated' AS event_label, p.goal AS detail
       FROM plans p
       JOIN users u ON u.id = p.user_id
       ORDER BY p.created_at DESC
       LIMIT ?`,
      [fetchLimit],
    ),
    conn.query(
      `SELECT 'profile_change' AS event_type, uh.user_id, u.name AS actor_name,
              u.email AS actor_email, uh.changed_at AS occurred_at,
              'Profile updated' AS event_label, uh.field_name AS detail
       FROM user_history uh
       JOIN users u ON u.id = uh.user_id
       ORDER BY uh.changed_at DESC
       LIMIT ?`,
      [fetchLimit],
    ),
  ];

  const results = await Promise.all(queries);
  const merged = results
    .flatMap(([rows]) => rows)
    .sort((a, b) => new Date(b.occurred_at) - new Date(a.occurred_at));

  const events = merged.slice(offset, offset + safeLimit).map((row) => ({
    eventType: row.event_type,
    userId: row.user_id,
    actorName: row.actor_name || `User #${row.user_id}`,
    actorEmail: row.actor_email,
    eventLabel: row.event_label,
    detail: row.detail,
    occurredAt: row.occurred_at,
  }));

  const [[countRow]] = await conn.query(
    `SELECT (
       (SELECT COUNT(*) FROM users) +
       (SELECT COUNT(*) FROM daily_logs) +
       (SELECT COUNT(*) FROM weight_logs) +
       (SELECT COUNT(*) FROM plans) +
       (SELECT COUNT(*) FROM user_history)
     ) AS total`,
  );

  const total = toNumber(countRow.total);

  return {
    events,
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      totalPages: Math.ceil(total / safeLimit) || 1,
    },
  };
}
