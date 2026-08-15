// src/middleware/rateLimiter.js

import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import { AI_RATE_LIMIT_CODE, AI_RATE_LIMIT_MESSAGE } from "../modules/ai/utils/aiErrors.js";
import { RATE_LIMIT_CONFIG } from "../config/rateLimit.js";

function secondsUntilReset(req) {
  const resetTime = req.rateLimit?.resetTime;
  if (!resetTime) return null;
  return Math.max(1, Math.ceil((new Date(resetTime).getTime() - Date.now()) / 1000));
}

function rateLimitResponse(req, message, code = "RATE_LIMIT") {
  const retryAfterSeconds = secondsUntilReset(req);
  return {
    success: false,
    statusCode: 429,
    message,
    code,
    details: retryAfterSeconds
      ? {
          retryAfterSeconds,
          limit: req.rateLimit?.limit ?? null,
        }
      : null,
  };
}

function createLimiter({ windowMs, max, message, code = "RATE_LIMIT", keyGenerator }) {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    ...(keyGenerator ? { keyGenerator } : {}),
    handler: (req, res) => {
      const retryAfterSeconds = secondsUntilReset(req);
      if (retryAfterSeconds) {
        res.setHeader("Retry-After", String(retryAfterSeconds));
      }
      res.status(429).json(rateLimitResponse(req, message, code));
    },
  });
}

/** Prefer authenticated user id when present; fall back to IP. */
function userOrIpKey(req) {
  const userId = req.user?.id ?? req.user?.userId;
  if (userId != null) return `user:${userId}`;
  return ipKeyGenerator(req.ip);
}

export const apiLimiter = createLimiter({
  ...RATE_LIMIT_CONFIG.api,
  message: "Too many requests. Please try again later.",
});

export const authLimiter = createLimiter({
  ...RATE_LIMIT_CONFIG.auth,
  message:
    "Too many authentication attempts. Please wait a few minutes and try again.",
  code: "AUTH_RATE_LIMIT",
});

/** General AI routes (feedback, coaching). */
export const aiLimiter = createLimiter({
  ...RATE_LIMIT_CONFIG.ai,
  message: AI_RATE_LIMIT_MESSAGE,
  code: AI_RATE_LIMIT_CODE,
  keyGenerator: userOrIpKey,
});

/** Stricter limiter for plan generation. */
export const aiPlanLimiter = createLimiter({
  ...RATE_LIMIT_CONFIG.aiPlan,
  message:
    "You have reached the plan generation limit. Please wait before generating another plan.",
  code: AI_RATE_LIMIT_CODE,
  keyGenerator: userOrIpKey,
});

export const contactLimiter = createLimiter({
  ...RATE_LIMIT_CONFIG.contact,
  message: "Too many messages sent. Please try again later.",
});
