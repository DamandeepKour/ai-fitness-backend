import db from "../../config/db.js";
import { notificationPrefsTable } from "../plans/premiumModel.js";
import { getFrontendUrl } from "../../config/email.js";
import { sendDailyReminderEmail } from "./emailService.js";
import {
  getNotificationPrefsService,
  isWithinQuietHours,
} from "./notificationService.js";
import { getDailyLogs } from "../meals/dailyLogRepo.js";
import { serverCalendarYmd } from "../../utils/localDate.js";
import { getStreakService } from "../users/streakService.js";

export async function listReminderCandidates({
  mealReminders = true,
  waterReminders = true,
  limit = 2000,
} = {}) {
  const conn = await db();
  const clauses = [];
  if (mealReminders) clauses.push("np.meal_reminders = 1");
  if (waterReminders) clauses.push("np.water_reminders = 1");
  if (!clauses.length) return [];

  const [rows] = await conn.query(
    `SELECT u.id, u.email, u.name,
            np.meal_reminders, np.water_reminders,
            np.quiet_start, np.quiet_end
     FROM ${notificationPrefsTable} np
     INNER JOIN users u ON u.id = np.user_id
     WHERE (${clauses.join(" OR ")})
       AND u.email IS NOT NULL
       AND TRIM(u.email) <> ''
     ORDER BY u.id ASC
     LIMIT ?`,
    [limit],
  );

  return rows.map((row) => ({
    id: Number(row.id),
    email: row.email,
    name: row.name,
    meal_reminders: row.meal_reminders === 1 || row.meal_reminders === true,
    water_reminders: row.water_reminders === 1 || row.water_reminders === true,
    quiet_start: row.quiet_start,
    quiet_end: row.quiet_end,
  }));
}

export async function sendDailyReminderForUser(userId, options = {}) {
  const asOfDate = options.asOfDate || serverCalendarYmd();
  const prefs = await getNotificationPrefsService(userId);

  if (!prefs?.meal_reminders && !prefs?.water_reminders) {
    return { sent: false, reason: "reminders_disabled", userId };
  }

  if (isWithinQuietHours(prefs)) {
    return { sent: false, reason: "quiet_hours", userId };
  }

  const conn = await db();
  const [users] = await conn.query(
    `SELECT id, name, email FROM users WHERE id = ? LIMIT 1`,
    [userId],
  );
  const user = users[0];
  if (!user?.email) {
    return { sent: false, reason: "user_not_found", userId };
  }

  const todaysLogs = await getDailyLogs(userId, asOfDate);
  const mealsLogged = todaysLogs.length;
  const streak = await getStreakService(userId).catch(() => ({ currentStreak: 0 }));

  const emailResult = await sendDailyReminderEmail({
    to: user.email,
    name: user.name,
    mealsLogged,
    includeMeal: Boolean(prefs.meal_reminders),
    includeWater: Boolean(prefs.water_reminders),
    currentStreak: streak.currentStreak || 0,
    appUrl: getFrontendUrl(),
    asOfDate,
  });

  return {
    sent: emailResult.sent === true,
    reason: emailResult.reason || null,
    userId: Number(userId),
    email: user.email,
    mealsLogged,
    currentStreak: streak.currentStreak || 0,
  };
}
