import { logger } from "../config/logger.js";
import { getRequestContext } from "../context/requestContext.js";

export const AUDIT_ACTIONS = {
  SIGNUP: "signup",
  LOGIN: "login",
  MEAL_LOG_CREATE: "meal_log_create",
  DIET_PLAN_GENERATION: "diet_plan_generation",
  WORKOUT_PLAN_GENERATION: "workout_plan_generation",
  ADMIN_ACTION: "admin_action",
};

/**
 * Structured audit log for important backend actions.
 * Always includes requestId, userId, route, latency, and result status.
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

  return payload;
}
