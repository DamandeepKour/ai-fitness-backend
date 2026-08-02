import cors from "cors";
import helmet from "helmet";
import { getAllowedCorsOrigins, isProductionEnv } from "../config/env.js";

/**
 * Security middleware: Helmet headers + locked-down CORS.
 */
export function applySecurityMiddleware(app) {
  app.disable("x-powered-by");

  app.use(
    helmet({
      // API-only; tighten CSP if you ever serve HTML from this app.
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
      hsts: isProductionEnv()
        ? { maxAge: 15552000, includeSubDomains: true, preload: false }
        : false,
    }),
  );

  const allowedOrigins = getAllowedCorsOrigins();

  app.use(
    cors({
      origin(origin, callback) {
        // Allow non-browser clients (curl, health checks, server-to-server).
        if (!origin) return callback(null, true);
        if (allowedOrigins.includes(origin)) return callback(null, true);
        return callback(new Error("CORS origin not allowed"));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: [
        "Content-Type",
        "Authorization",
        "X-Request-Id",
        "X-Requested-With",
      ],
      exposedHeaders: ["X-Request-Id", "RateLimit-Limit", "RateLimit-Remaining", "Retry-After"],
      maxAge: 86400,
    }),
  );
}

/**
 * Express error-style CORS rejection → 403 JSON (not an unhandled 500).
 */
export function corsErrorHandler(err, req, res, next) {
  if (err && String(err.message || "").includes("CORS origin not allowed")) {
    return res.status(403).json({
      success: false,
      statusCode: 403,
      message: "Origin not allowed",
      code: "CORS_DENIED",
      details: null,
    });
  }
  return next(err);
}
