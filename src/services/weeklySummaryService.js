import db from "../config/db.js";
import { getDailyLogsForLastDays } from "../repositories/dailyLogRepo.js";
import { getUserStreak } from "../repositories/streakRepo.js";
import { getFrontendUrl } from "../config/email.js";
import { sendWeeklySummaryEmail } from "./emailService.js";
import { serverCalendarYmd } from "../utils/localDate.js";
import { calculateAndSaveStreak } from "./streakService.js";

async function getUserEmailProfile(userId) {
  const conn = await db();
  const [rows] = await conn.query(
    `SELECT id, name, email, goal FROM users WHERE id = ? LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
}

export async function buildWeeklySummary(userId, endDate = serverCalendarYmd()) {
  const logs = await getDailyLogsForLastDays(userId, endDate, 7);
  const byDay = new Map();

  for (const log of logs) {
    const day = log.log_date instanceof Date
      ? log.log_date.toISOString().slice(0, 10)
      : String(log.log_date).slice(0, 10);
    const entry = byDay.get(day) || { calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 };
    entry.calories += Number(log.calories || 0);
    entry.protein += Number(log.protein || 0);
    entry.carbs += Number(log.carbs || 0);
    entry.fat += Number(log.fat || 0);
    entry.meals += 1;
    byDay.set(day, entry);
  }

  const daysLogged = byDay.size;
  const totals = [...byDay.values()].reduce(
    (acc, day) => ({
      calories: acc.calories + day.calories,
      protein: acc.protein + day.protein,
      carbs: acc.carbs + day.carbs,
      fat: acc.fat + day.fat,
      meals: acc.meals + day.meals,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0, meals: 0 },
  );

  const streak = await calculateAndSaveStreak(userId, endDate).catch(async () => {
    const row = await getUserStreak(userId);
    return {
      currentStreak: Number(row?.current_streak || 0),
      longestStreak: Number(row?.longest_streak || 0),
    };
  });

  return {
    userId: Number(userId),
    endDate,
    daysLogged,
    totals,
    averages: {
      calories: daysLogged ? Math.round(totals.calories / daysLogged) : 0,
      protein: daysLogged ? Math.round(totals.protein / daysLogged) : 0,
      meals: daysLogged ? Math.round((totals.meals / daysLogged) * 10) / 10 : 0,
    },
    daily: [...byDay.entries()].map(([day, stats]) => ({ day, ...stats })),
    streak: {
      current: streak.currentStreak,
      longest: streak.longestStreak,
    },
  };
}

export async function generateAndSendWeeklySummary(userId, endDate = serverCalendarYmd()) {
  const user = await getUserEmailProfile(userId);
  if (!user?.email) {
    return { sent: false, reason: "user_not_found", userId };
  }

  const summary = await buildWeeklySummary(userId, endDate);
  const appUrl = getFrontendUrl();

  const emailResult = await sendWeeklySummaryEmail({
    to: user.email,
    name: user.name,
    summary,
    goal: user.goal,
    appUrl,
  });

  return {
    sent: emailResult.sent === true,
    reason: emailResult.reason || null,
    userId: Number(userId),
    email: user.email,
    summary,
  };
}

export async function listWeeklySummaryRecipients(limit = 2000) {
  const conn = await db();
  const [rows] = await conn.query(
    `SELECT DISTINCT u.id, u.email, u.name
     FROM users u
     INNER JOIN daily_logs d ON d.user_id = u.id
     WHERE d.log_date >= DATE_SUB(CURDATE(), INTERVAL 14 DAY)
       AND u.email IS NOT NULL
       AND TRIM(u.email) <> ''
       AND (u.is_verified = 1 OR u.is_verified IS NULL)
     ORDER BY u.id ASC
     LIMIT ?`,
    [limit],
  );
  return rows;
}
