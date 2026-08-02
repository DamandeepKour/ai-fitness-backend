import dotenv from "dotenv";
dotenv.config();

import { hydrateDbEnvFromProvider } from "./src/config/db.js";
hydrateDbEnvFromProvider();

import { validateEnv } from "./src/config/env.js";
import { logger } from "./src/config/logger.js";

try {
  validateEnv();
} catch (err) {
  console.error("❌", err.message);
  process.exit(1);
}

process.on("uncaughtException", (err) => {
  logger.fatal({ type: "process", err: err.stack || err.message }, "Uncaught Exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.error(
    { type: "process", err: reason instanceof Error ? reason.stack || reason.message : String(reason) },
    "Unhandled Rejection",
  );
});

import express from "express";
import http from "http";
import initDb from "./initDb.js";
import routes from "./src/routes/index.js";
import notFound from "./src/middleware/notFound.js";
import errorHandler from "./src/middleware/errorHandler.js";
import trafficMiddleware from "./src/middleware/trafficMiddleware.js";
import requestContextMiddleware from "./src/middleware/requestContext.js";
import requestLoggerMiddleware from "./src/middleware/requestLogger.js";
import { applySecurityMiddleware, corsErrorHandler } from "./src/middleware/security.js";
import { apiLimiter } from "./src/middleware/rateLimiter.js";
import { connectRedis } from "./src/config/redis.js";
import { connectMongo } from "./src/config/mongo.js";
import { initSocket } from "./src/config/socket.js";
import { registerGracefulShutdown } from "./src/config/shutdown.js";
import { startVerificationCleanupJob } from "./src/jobs/verificationCleanupJob.js";
import { startFitnovaWorker } from "./src/jobs/worker.js";
import { startJobSchedulers } from "./src/jobs/schedulers.js";
import { getLivenessStatus, getReadinessStatus } from "./src/config/health.js";

const app = express();
const API_VERSION = "v1";

// Required for accurate client IPs behind Render/Railway (rate limiting).
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

/** Liveness probe — process is alive (no dependency checks). */
app.get("/health", (req, res) => {
  res.status(200).json(getLivenessStatus());
});

/** Readiness probe — MySQL + AI must be up before receiving traffic. */
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
apiRouter.use(apiLimiter);
apiRouter.use(requestLoggerMiddleware);
apiRouter.use(trafficMiddleware);
apiRouter.use(routes);

// Canonical versioned API.
app.use(`/api/${API_VERSION}`, apiRouter);

// Backward-compatible unversioned /api/* (skip if already under /v1).
app.use("/api", (req, res, next) => {
  if (req.path === `/${API_VERSION}` || req.path.startsWith(`/${API_VERSION}/`)) {
    return next();
  }
  return apiRouter(req, res, next);
});

app.use(notFound);
app.use(corsErrorHandler);
app.use(errorHandler);

const PORT = Number(process.env.PORT) || 5000;

const startServer = async () => {
  try {
    logger.info({ type: "startup" }, "Starting server...");
    logger.info({
      type: "startup",
      nodeEnv: process.env.NODE_ENV || "development",
      apiVersion: API_VERSION,
      dbHost: process.env.DB_HOST?.trim() || null,
      mysqlUrl: Boolean(process.env.MYSQL_URL?.trim()),
      mysqlPublicUrl: Boolean(process.env.MYSQL_PUBLIC_URL?.trim()),
      redisUrl: Boolean(process.env.REDIS_URL?.trim()),
      mongodbUri: Boolean(process.env.MONGODB_URI?.trim()),
      frontendUrl: Boolean(process.env.FRONTEND_URL?.trim()),
    }, "Environment summary");

    await initDb();
    await connectRedis();
    await connectMongo();
    startVerificationCleanupJob();

    // In-process worker + cron dispatchers (set JOB_WORKER_EMBEDDED=false to disable).
    if (process.env.JOB_WORKER_EMBEDDED !== "false") {
      startFitnovaWorker();
    }
    startJobSchedulers();

    const httpServer = http.createServer(app);
    initSocket(httpServer);
    registerGracefulShutdown({ httpServer });

    httpServer.listen(PORT, "0.0.0.0", () => {
      logger.info({ type: "startup", port: PORT }, `Server running on port ${PORT}`);
      logger.info({ type: "startup", api: `/api/${API_VERSION}` }, "API version mounted");
      logger.info({ type: "startup" }, "WebSocket ready at /socket.io");
    });
  } catch (error) {
    logger.fatal({ type: "startup", err: error.stack || error.message }, "Failed to start server");
    process.exit(1);
  }
};

startServer();
