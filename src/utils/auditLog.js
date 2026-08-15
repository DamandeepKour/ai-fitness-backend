import { logger } from "../config/logger.js";
import { getRequestContext } from "../context/requestContext.js";
import {
  ANALYTICS_EVENT_TYPES,
  trackAnalyticsEvent,
} from "../modules/analytics/analyticsEventService.js";

export const AUDIT_ACTIONS = {
  SIGNUP: "signup",
  LOGIN: "login",
  MEAL_LOG_CREATE: "meal_log_create",
  DIET_PLAN_GENERATION: "diet_plan_generation",
  WORKOUT_PLAN_GENERATION: "workout_plan_generation",
  PLAN_GENERATION: "plan_generation",
  ADMIN_ACTION: "admin_action",
};

const ACTION_TO_EVENT = {
  [AUDIT_ACTIONS.SIGNUP]: ANALYTICS_EVENT_TYPES.SIGNUP,
  [AUDIT_ACTIONS.LOGIN]: ANALYTICS_EVENT_TYPES.LOGIN,
  [AUDIT_ACTIONS.MEAL_LOG_CREATE]: ANALYTICS_EVENT_TYPES.MEAL_LOG_CREATE,
  [AUDIT_ACTIONS.DIET_PLAN_GENERATION]: ANALYTICS_EVENT_TYPES.DIET_PLAN_GENERATION,
  [AUDIT_ACTIONS.WORKOUT_PLAN_GENERATION]: ANALYTICS_EVENT_TYPES.WORKOUT_PLAN_GENERATION,
  [AUDIT_ACTIONS.PLAN_GENERATION]: ANALYTICS_EVENT_TYPES.PLAN_GENERATION,
  [AUDIT_ACTIONS.ADMIN_ACTION]: ANALYTICS_EVENT_TYPES.ADMIN_ACTION,
};

/**
 * Structured audit log for important backend actions.
 * Always includes requestId, userId, route, latency, and result status.
 * Successful actions are dual-written to MongoDB for analytics aggregations.
 */
export function logAction({
  action,
  status = "success",
  req = null,
  userId = null,
  latencyMs = null,
  message = null,
  meta = null,
}) {
  const ctx = getRequestContext();
  const startedAt = req?.startedAt ?? ctx.startedAt ?? null;
  const computedLatency =
    latencyMs != null
      ? latencyMs
      : startedAt != null
        ? Date.now() - startedAt
        : null;

  const payload = {
    type: "audit",
    action,
    status,
    requestId: req?.requestId ?? ctx.requestId ?? null,
    userId: userId ?? req?.user?.id ?? ctx.userId ?? null,
    route: req ? (req.originalUrl?.split("?")[0] || req.path) : (ctx.route ?? null),
    method: req?.method ?? ctx.method ?? null,
    latencyMs: computedLatency,
    ...(message ? { message } : {}),
    ...(meta ? { meta } : {}),
  };

  if (status === "error" || status === "failure") {
    logger.warn(payload, message || action);
  } else {
    logger.info(payload, message || action);
  }

  const eventType = ACTION_TO_EVENT[action];
  if (eventType && status === "success") {
    void trackAnalyticsEvent({
      eventType,
      userId: payload.userId,
      goal: meta?.goal ?? null,
      status,
      requestId: payload.requestId,
      route: payload.route,
      latencyMs: payload.latencyMs,
      meta,
    });
  }

  return payload;
}
