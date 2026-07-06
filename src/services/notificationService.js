import {
  createNotificationPrefs,
  findNotificationPrefsByUserId,
  updateNotificationPrefs,
} from "../repositories/notificationRepo.js";
import { updateNotificationPrefsSchema } from "../validators/notificationValidator.js";

const BOOLEAN_FIELDS = new Set([
  "whatsapp_enabled",
  "meal_reminders",
  "water_reminders",
  "coaching_tips",
  "goal_milestones",
  "wind_down",
]);

function toBooleanFlag(value) {
  return value === true || value === 1 || value === "1";
}

function normalizePrefs(row) {
  if (!row) return null;

  return {
    id: row.id,
    user_id: row.user_id,
    whatsapp_enabled: toBooleanFlag(row.whatsapp_enabled),
    meal_reminders: toBooleanFlag(row.meal_reminders),
    water_reminders: toBooleanFlag(row.water_reminders),
    coaching_tips: toBooleanFlag(row.coaching_tips),
    goal_milestones: toBooleanFlag(row.goal_milestones),
    wind_down: toBooleanFlag(row.wind_down),
    workout_plan_type: row.workout_plan_type || "daily",
    quiet_start: row.quiet_start || "22:00",
    quiet_end: row.quiet_end || "07:00",
    updated_at: row.updated_at,
  };
}

function normalizeUpdatePayload(data) {
  const { error, value } = updateNotificationPrefsSchema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    throw new Error(error.details[0]?.message || "Invalid notification preferences");
  }

  const updates = {};

  for (const [key, raw] of Object.entries(value)) {
    if (BOOLEAN_FIELDS.has(key)) {
      updates[key] = toBooleanFlag(raw) ? 1 : 0;
      continue;
    }
    updates[key] = raw;
  }

  return updates;
}

export async function getNotificationPrefsService(userId) {
  let row = await findNotificationPrefsByUserId(userId);
  if (!row) {
    row = await createNotificationPrefs(userId);
  }
  return normalizePrefs(row);
}

export async function updateNotificationPrefsService(userId, data) {
  const updates = normalizeUpdatePayload(data);
  const existing = await getNotificationPrefsService(userId);
  if (!existing) {
    await createNotificationPrefs(userId);
  }

  const row = await updateNotificationPrefs(userId, updates);
  return normalizePrefs(row);
}

export function isWithinQuietHours(prefs, date = new Date()) {
  if (!prefs?.quiet_start || !prefs?.quiet_end) return false;

  const [startHour, startMinute] = prefs.quiet_start.split(":").map(Number);
  const [endHour, endMinute] = prefs.quiet_end.split(":").map(Number);
  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const startMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  if (startMinutes === endMinutes) return false;
  if (startMinutes < endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes < endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes < endMinutes;
}
