import { serverCalendarYmd } from "../../utils/localDate.js";
import {
  getDistinctLogDates,
  getUserStreak,
  upsertUserStreak,
} from "./streakRepo.js";

function shiftYmd(ymd, deltaDays) {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  date.setUTCDate(date.getUTCDate() + deltaDays);
  return date.toISOString().slice(0, 10);
}

/**
 * Compute consecutive meal-log days ending on asOfDate (or yesterday if none today).
 */
export function computeStreakFromDates(logDates, asOfDate = serverCalendarYmd()) {
  const set = new Set(logDates);
  let cursor = asOfDate;

  if (!set.has(cursor)) {
    cursor = shiftYmd(asOfDate, -1);
  }

  if (!set.has(cursor)) {
    return {
      currentStreak: 0,
      longestStreak: longestRun(logDates),
      lastLogDate: latestDate(logDates),
    };
  }

  let current = 0;
  while (set.has(cursor)) {
    current += 1;
    cursor = shiftYmd(cursor, -1);
  }

  return {
    currentStreak: current,
    longestStreak: Math.max(current, longestRun(logDates)),
    lastLogDate: latestDate(logDates),
  };
}

function latestDate(logDates) {
  if (!logDates.length) return null;
  return [...logDates].sort().at(-1);
}

function longestRun(logDates) {
  if (!logDates.length) return 0;
  const sorted = [...logDates].sort();
  let best = 1;
  let run = 1;

  for (let i = 1; i < sorted.length; i += 1) {
    const prev = sorted[i - 1];
    const curr = sorted[i];
    if (curr === shiftYmd(prev, 1)) {
      run += 1;
      best = Math.max(best, run);
    } else if (curr !== prev) {
      run = 1;
    }
  }
  return best;
}

export async function calculateAndSaveStreak(userId, asOfDate = serverCalendarYmd()) {
  const dates = await getDistinctLogDates(userId);
  const computed = computeStreakFromDates(dates, asOfDate);
  const saved = await upsertUserStreak({
    userId,
    currentStreak: computed.currentStreak,
    longestStreak: computed.longestStreak,
    lastLogDate: computed.lastLogDate,
  });

  return {
    userId: Number(userId),
    currentStreak: Number(saved?.current_streak ?? computed.currentStreak),
    longestStreak: Number(saved?.longest_streak ?? computed.longestStreak),
    lastLogDate: saved?.last_log_date
      ? String(saved.last_log_date).slice(0, 10)
      : computed.lastLogDate,
    asOfDate,
  };
}

export async function getStreakService(userId) {
  const row = await getUserStreak(userId);
  if (!row) {
    return calculateAndSaveStreak(userId);
  }
  return {
    userId: Number(userId),
    currentStreak: Number(row.current_streak || 0),
    longestStreak: Number(row.longest_streak || 0),
    lastLogDate: row.last_log_date ? String(row.last_log_date).slice(0, 10) : null,
  };
}
