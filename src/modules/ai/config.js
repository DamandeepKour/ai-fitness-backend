export const AI_CONFIG = {
  provider: process.env.AI_PROVIDER || "groq",
  model: process.env.AI_MODEL || "llama-3.1-8b-instant",
  timeoutMs: Number(process.env.AI_TIMEOUT_MS || 45000),
  maxRetries: Number(process.env.AI_MAX_RETRIES || 2),
  retryDelayMs: Number(process.env.AI_RETRY_DELAY_MS || 800),
  logToDatabase: process.env.AI_LOG_METADATA !== "false",
};

export const AI_FEATURES = {
  PLAN: "plan",
  COACHING: "coaching",
  FEEDBACK: "feedback",
  EXPLAIN_PLAN: "explain_plan",
  EXPLAIN_MEAL: "explain_meal",
};

export const AI_STATUS = {
  SUCCESS: "success",
  FALLBACK: "fallback",
  ERROR: "error",
};
