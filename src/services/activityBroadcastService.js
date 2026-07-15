import db from "../config/db.js";
import { emitToSuperadmin } from "../config/socket.js";

const userCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function normalizePath(path = "") {
  return path.replace(/^\/api/, "") || path;
}

function isSuccessful(statusCode) {
  return statusCode >= 200 && statusCode < 300;
}

function inferActivityEvent(method, path, statusCode) {
  if (!isSuccessful(statusCode)) return null;

  const normalized = normalizePath(path);
  const upperMethod = String(method || "").toUpperCase();

  if (upperMethod === "POST" && (normalized === "/auth/signup" || normalized === "/auth/google")) {
    return { eventType: "signup", eventLabel: "New signup", detail: null };
  }
  if (upperMethod === "POST" && normalized === "/daily-log/add") {
    return { eventType: "meal_log", eventLabel: "Meal logged", detail: null };
  }
  if (upperMethod === "POST" && normalized === "/weight/add") {
    return { eventType: "weight_update", eventLabel: "Weight update logged", detail: null };
  }
  if (upperMethod === "POST" && normalized === "/plan/generate-plan") {
    return { eventType: "plan_generated", eventLabel: "Meal plan generated", detail: null };
  }
  if (upperMethod === "PUT" && normalized === "/user/update") {
    return { eventType: "profile_change", eventLabel: "Profile updated", detail: "profile" };
  }

  return null;
}

async function resolveUser(userId) {
  if (!userId) {
    return { actorName: "Anonymous", actorEmail: null };
  }

  const cached = userCache.get(userId);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return cached.data;
  }

  const conn = await db();
  const [rows] = await conn.query(
    "SELECT name, email FROM users WHERE id = ? LIMIT 1",
    [userId],
  );
  const row = rows[0];
  const data = {
    actorName: row?.name || `User #${userId}`,
    actorEmail: row?.email || null,
  };

  userCache.set(userId, { data, cachedAt: Date.now() });
  return data;
}

function formatHourBucket(date = new Date()) {
  const d = new Date(date);
  d.setMinutes(0, 0, 0);
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:00:00`;
}

export async function broadcastTrafficUpdate({
  logId,
  userId,
  method,
  path,
  statusCode,
  durationMs,
  ip,
  userAgent,
  createdAt,
}) {
  const user = await resolveUser(userId);
  const occurredAt = createdAt || new Date().toISOString();
  const isError = statusCode >= 400;

  emitToSuperadmin("traffic:log", {
    id: logId,
    userId,
    userName: user.actorName,
    userEmail: user.actorEmail,
    method,
    path,
    statusCode,
    durationMs,
    ip,
    userAgent,
    createdAt: occurredAt,
  });

  emitToSuperadmin("traffic:summary:patch", {
    apiRequestsDelta: 1,
    eventsDelta: 0,
    durationMs,
    isError,
    userId,
  });

  emitToSuperadmin("traffic:history:patch", {
    bucket: formatHourBucket(new Date(occurredAt)),
    requestsDelta: 1,
    durationMs,
    isError,
  });

  const activityMeta = inferActivityEvent(method, path, statusCode);
  if (activityMeta && !normalizePath(path).startsWith("/superadmin")) {
    emitToSuperadmin("activity:event", {
      ...activityMeta,
      userId,
      actorName: activityMeta.eventType === "signup" && !userId ? "New user" : user.actorName,
      actorEmail: user.actorEmail,
      occurredAt,
    });

    emitToSuperadmin("traffic:summary:patch", {
      apiRequestsDelta: 0,
      eventsDelta: 1,
      durationMs: 0,
      isError: false,
      userId,
    });
  }
}
