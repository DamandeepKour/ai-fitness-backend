import db from "../../config/db.js";
import { userStreakTable } from "./userStreakModel.js";

export async function getDistinctLogDates(userId, limit = 120) {
  const conn = await db();
  const [rows] = await conn.query(
    `SELECT DISTINCT log_date
     FROM daily_logs
     WHERE user_id = ?
     ORDER BY log_date DESC
     LIMIT ?`,
    [userId, limit],
  );
  return rows.map((r) => {
    const raw = r.log_date;
    if (raw instanceof Date) return raw.toISOString().slice(0, 10);
    return String(raw).slice(0, 10);
  });
}

export async function upsertUserStreak({
  userId,
  currentStreak,
  longestStreak,
  lastLogDate,
}) {
  const conn = await db();
  await conn.query(
    `INSERT INTO ${userStreakTable}
      (user_id, current_streak, longest_streak, last_log_date)
     VALUES (?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       current_streak = VALUES(current_streak),
       longest_streak = VALUES(longest_streak),
       last_log_date = VALUES(last_log_date)`,
    [userId, currentStreak, longestStreak, lastLogDate],
  );

  const [rows] = await conn.query(
    `SELECT * FROM ${userStreakTable} WHERE user_id = ? LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
}

export async function getUserStreak(userId) {
  const conn = await db();
  const [rows] = await conn.query(
    `SELECT * FROM ${userStreakTable} WHERE user_id = ? LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
}

export async function listActiveUserIds(limit = 5000) {
  const conn = await db();
  const [rows] = await conn.query(
    `SELECT DISTINCT user_id AS id
     FROM daily_logs
     WHERE log_date >= DATE_SUB(CURDATE(), INTERVAL 60 DAY)
     ORDER BY user_id ASC
     LIMIT ?`,
    [limit],
  );
  return rows.map((r) => Number(r.id));
}
