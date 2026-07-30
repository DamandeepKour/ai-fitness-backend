// src/middleware/rateLimiter.js

import rateLimit from "express-rate-limit";
import { AI_RATE_LIMIT_CODE, AI_RATE_LIMIT_MESSAGE } from "../ai/utils/aiErrors.js";

function rateLimitResponse(statusCode, message, code = "RATE_LIMIT") {
  return {
    success: false,
    statusCode,
    message,
    code,
    details: null,
  };
}

// General API limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(
      rateLimitResponse(429, "Too many requests. Please try again later."),
    );
  },
});

// Strict limiter for AI plan generation
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json(
      rateLimitResponse(429, AI_RATE_LIMIT_MESSAGE, AI_RATE_LIMIT_CODE),
    );
  },
});

export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  handler: (req, res) => {
    res.status(429).json(
      rateLimitResponse(429, "Too many messages sent. Please try again later."),
    );
  },
});
