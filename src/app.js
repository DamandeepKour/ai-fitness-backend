import express from "express";
import routes from "./routes/index.js";
import notFound from "./middleware/notFound.js";
import errorHandler from "./middleware/errorHandler.js";
import trafficMiddleware from "./middleware/trafficMiddleware.js";
import requestContextMiddleware from "./middleware/requestContext.js";
import requestLoggerMiddleware from "./middleware/requestLogger.js";
import { applySecurityMiddleware, corsErrorHandler } from "./middleware/security.js";
import { apiLimiter } from "./middleware/rateLimiter.js";
import { getLivenessStatus, getReadinessStatus } from "./config/health.js";
import { logger } from "./config/logger.js";

export const API_VERSION = "v1";

/**
 * Build the Express app without listening or starting workers.
 * Used by production server and HTTP tests.
 */
export function createApp({
  enableApiLimiter = process.env.NODE_ENV !== "test",
  enableTraffic = process.env.NODE_ENV !== "test",
  enableRequestLogger = process.env.NODE_ENV !== "test",
} = {}) {
  const app = express();

  app.set("trust proxy", 1);

  applySecurityMiddleware(app);
  app.use(express.json({ limit: process.env.BODY_SIZE_LIMIT || "1mb" }));
  app.use(requestContextMiddleware);

  app.get("/", (req, res) => {
    res.json({
      service: "ai-fitness-backend",
      status: "ok",
      api: `/api/${API_VERSION}`,
    });
  });

  app.get("/health", (req, res) => {
    res.status(200).json(getLivenessStatus());
  });

  app.get("/ready", async (req, res) => {
    try {
      const body = await getReadinessStatus();
      res.status(body.ready ? 200 : 503).json(body);
    } catch (err) {
      logger.error({ type: "health", err: err.message }, "Readiness check failed");
      res.status(503).json({
        status: "error",
        service: "ai-fitness-backend",
        check: "readiness",
        ready: false,
        timestamp: new Date().toISOString(),
        error: "readiness_check_failed",
      });
    }
  });

  const apiRouter = express.Router();
  if (enableApiLimiter) apiRouter.use(apiLimiter);
  if (enableRequestLogger) apiRouter.use(requestLoggerMiddleware);
  if (enableTraffic) apiRouter.use(trafficMiddleware);
  apiRouter.use(routes);

  app.use(`/api/${API_VERSION}`, apiRouter);
  app.use("/api", (req, res, next) => {
    if (req.path === `/${API_VERSION}` || req.path.startsWith(`/${API_VERSION}/`)) {
      return next();
    }
    return apiRouter(req, res, next);
  });

  app.use(notFound);
  app.use(corsErrorHandler);
  app.use(errorHandler);

  return app;
}

export default createApp;
