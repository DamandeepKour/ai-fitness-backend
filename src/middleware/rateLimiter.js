// src/middleware/rateLimiter.js

import rateLimit from "express-rate-limit";

// 🔥 General API limiter
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 min
  max: 100,
  message: {
    success: false,
    message: "Too many requests, try again later",
  },
});

// 🔥 Strict limiter for AI
export const aiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    message: "AI limit exceeded, upgrade plan",
  },
});

// Contact form — prevent spam on public endpoint
export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Too many messages sent. Please try again later.",
  },
});