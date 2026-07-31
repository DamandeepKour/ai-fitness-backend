function envInt(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

/**
 * Rate limit settings — all values overridable via environment variables.
 * Defaults are production-safe; loosen locally if needed.
 */
export const RATE_LIMIT_CONFIG = {
  // General API (optional baseline)
  api: {
    windowMs: envInt("RATE_LIMIT_API_WINDOW_MS", 15 * 60 * 1000),
    max: envInt("RATE_LIMIT_API_MAX", 300),
  },

  // Auth: login, signup, password reset, magic links, etc.
  auth: {
    windowMs: envInt("RATE_LIMIT_AUTH_WINDOW_MS", 15 * 60 * 1000),
    max: envInt("RATE_LIMIT_AUTH_MAX", 20),
  },

  // AI endpoints (feedback, coaching) — cost-sensitive
  ai: {
    windowMs: envInt("RATE_LIMIT_AI_WINDOW_MS", 15 * 60 * 1000),
    max: envInt("RATE_LIMIT_AI_MAX", 30),
  },

  // AI plan generation — stricter (most expensive)
  aiPlan: {
    windowMs: envInt("RATE_LIMIT_AI_PLAN_WINDOW_MS", 15 * 60 * 1000),
    max: envInt("RATE_LIMIT_AI_PLAN_MAX", 8),
  },

  // Contact form
  contact: {
    windowMs: envInt("RATE_LIMIT_CONTACT_WINDOW_MS", 60 * 60 * 1000),
    max: envInt("RATE_LIMIT_CONTACT_MAX", 10),
  },
};
