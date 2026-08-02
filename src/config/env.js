import Joi from "joi";

const isProduction = () => (process.env.NODE_ENV || "development") === "production";

/**
 * Validate critical environment variables at startup.
 * Production requires secrets + public URLs; development is more lenient.
 */
export function validateEnv(options = {}) {
  const production = isProduction();
  const requireAi = options.requireAi !== false;

  const schema = Joi.object({
    NODE_ENV: Joi.string()
      .valid("development", "production", "test")
      .default("development"),

    PORT: Joi.number().integer().min(1).max(65535).default(5000),

    JWT_SECRET: production
      ? Joi.string().min(32).required()
      : Joi.string().min(8).required(),
    JWT_EXPIRES_IN: Joi.string().default("7d"),

    GROQ_API_KEY: requireAi
      ? (production ? Joi.string().min(10).required() : Joi.string().allow("").optional())
      : Joi.string().allow("").optional(),

    FRONTEND_URL: production
      ? Joi.string().uri({ scheme: ["http", "https"] }).required()
      : Joi.string().uri({ scheme: ["http", "https"] }).default("http://localhost:5173"),

    APP_URL: Joi.string().uri({ scheme: ["http", "https"] }).optional().allow(""),

    // DB: either discrete vars (after hydrate) or URL forms
    DB_HOST: Joi.string().trim().min(1).required(),
    DB_USER: Joi.string().trim().min(1).required(),
    DB_NAME: Joi.string().trim().min(1).required(),
    DB_PASSWORD: Joi.string().allow("").optional(),
    DB_PORT: Joi.number().integer().default(3306),

    REDIS_URL: Joi.string().uri({ scheme: ["redis", "rediss"] }).optional().allow(""),
    MONGODB_URI: Joi.string().optional().allow(""),

    CORS_ORIGINS: Joi.string().optional().allow(""),
    BODY_SIZE_LIMIT: Joi.string().default("1mb"),
  })
    .unknown(true);

  const { error, value } = schema.validate(process.env, {
    abortEarly: false,
    convert: true,
  });

  if (error) {
    const details = error.details.map((d) => d.message).join("; ");
    const err = new Error(`Invalid environment configuration: ${details}`);
    err.code = "ENV_VALIDATION_FAILED";
    throw err;
  }

  // Extra production safety: reject placeholder secrets
  if (production) {
    const jwt = String(value.JWT_SECRET || "");
    if (
      jwt.includes("change-to")
      || jwt.includes("your-")
      || jwt === "secret"
      || jwt.length < 32
    ) {
      throw Object.assign(
        new Error("JWT_SECRET must be a strong random secret (min 32 chars) in production"),
        { code: "ENV_VALIDATION_FAILED" },
      );
    }

    const frontend = String(value.FRONTEND_URL || "");
    if (frontend.includes("localhost") || frontend.includes("127.0.0.1")) {
      throw Object.assign(
        new Error("FRONTEND_URL must be a public URL in production (not localhost)"),
        { code: "ENV_VALIDATION_FAILED" },
      );
    }
  }

  // Apply defaults back onto process.env for downstream code
  if (!process.env.JWT_EXPIRES_IN) {
    process.env.JWT_EXPIRES_IN = value.JWT_EXPIRES_IN;
  }
  if (!process.env.FRONTEND_URL) {
    process.env.FRONTEND_URL = value.FRONTEND_URL;
  }
  if (!process.env.BODY_SIZE_LIMIT) {
    process.env.BODY_SIZE_LIMIT = value.BODY_SIZE_LIMIT;
  }

  return value;
}

export function getAllowedCorsOrigins() {
  const extras = String(process.env.CORS_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const origins = new Set([
    process.env.FRONTEND_URL,
    ...extras,
  ].filter(Boolean));

  if (!isProduction()) {
    origins.add("http://localhost:5173");
    origins.add("http://127.0.0.1:5173");
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }

  return [...origins];
}

export function isProductionEnv() {
  return isProduction();
}
