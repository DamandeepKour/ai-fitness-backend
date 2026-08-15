import { isMongoReady } from "../../config/mongo.js";
import { logger } from "../../config/logger.js";
import AnalyticsEvent, { ANALYTICS_EVENT_TYPES } from "./analyticsEvent.js";

function toDayString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

/**
 * Fire-and-forget write of a product analytics event for Mongo aggregations.
 */
export async function trackAnalyticsEvent({
  eventType,
  userId = null,
  goal = null,
  status = "success",
  requestId = null,
  route = null,
  latencyMs = null,
  meta = null,
  at = null,
}) {
  if (!isMongoReady() || !eventType) return null;

  const createdAt = at ? new Date(at) : new Date();

  try {
    return await AnalyticsEvent.create({
      eventType,
      userId: userId != null ? Number(userId) : null,
      day: toDayString(createdAt),
      goal: goal || meta?.goal || null,
      status,
      requestId,
      route,
      latencyMs,
      meta,
      createdAt,
    });
  } catch (err) {
    logger.error(
      { type: "analytics", err: err.message, eventType, requestId },
      "Failed to write analytics event",
    );
    return null;
  }
}

/** In-process dedupe so we only upsert one activity event per user per day. */
const activityDedupe = new Set();
let activityDedupeDay = toDayString();

export function trackUserActivity({ userId, requestId = null, route = null }) {
  if (!userId || !isMongoReady()) return;

  const day = toDayString();
  if (day !== activityDedupeDay) {
    activityDedupe.clear();
    activityDedupeDay = day;
  }

  const key = `${day}:${userId}`;
  if (activityDedupe.has(key)) return;
  activityDedupe.add(key);

  void trackAnalyticsEvent({
    eventType: ANALYTICS_EVENT_TYPES.USER_ACTIVITY,
    userId,
    requestId,
    route,
    status: "success",
  });
}

export { ANALYTICS_EVENT_TYPES, toDayString };
