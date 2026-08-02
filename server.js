import dotenv from "dotenv";
dotenv.config();

import { hydrateDbEnvFromProvider } from "./src/config/db.js";
hydrateDbEnvFromProvider();

import { logger } from "./src/config/logger.js";

process.on("uncaughtException", (err) => {
  logger.fatal({ type: "process", err: err.stack || err.message }, "Uncaught Exception");
});

process.on("unhandledRejection", (reason) => {
  logger.error(
    { type: "process", err: reason instanceof Error ? reason.stack || reason.message : String(reason) },
    "Unhandled Rejection",
  );
});

import express from "express";
import http from "http";
import cors from "cors";
import initDb from "./initDb.js";
import routes from "./src/routes/index.js";
import notFound from "./src/middleware/notFound.js";
import errorHandler from "./src/middleware/errorHandler.js";
import trafficMiddleware from "./src/middleware/trafficMiddleware.js";
import requestContextMiddleware from "./src/middleware/requestContext.js";
import requestLoggerMiddleware from "./src/middleware/requestLogger.js";
import { connectRedis } from "./src/config/redis.js";
import { connectMongo } from "./src/config/mongo.js";
import { initSocket } from "./src/config/socket.js";
import { startVerificationCleanupJob } from "./src/jobs/verificationCleanupJob.js";
import { startFitnovaWorker } from "./src/jobs/worker.js";
import { startJobSchedulers } from "./src/jobs/schedulers.js";
import { getLivenessStatus, getReadinessStatus } from "./src/config/health.js";

const app = express();

// Required for accurate client IPs behind Render/Railway (rate limiting).
app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());
app.use(requestContextMiddleware);

app.get("/", (req, res) => {
  res.send("API is running 🚀");
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

app.use("/api", requestLoggerMiddleware, trafficMiddleware, routes);
app.use(notFound);
app.use(errorHandler);

// Render sets PORT automatically — do not hardcode 2002 unless you set it in Render env.
const PORT = Number(process.env.PORT) || 5000;

const startServer = async () => {
  try {
    logger.info({ type: "startup" }, "Starting server...");
    logger.info({
      type: "startup",
      nodeEnv: process.env.NODE_ENV || "development",
      dbHost: process.env.DB_HOST?.trim() || null,
      mysqlUrl: Boolean(process.env.MYSQL_URL?.trim()),
      mysqlPublicUrl: Boolean(process.env.MYSQL_PUBLIC_URL?.trim()),
      redisUrl: Boolean(process.env.REDIS_URL?.trim()),
      mongodbUri: Boolean(process.env.MONGODB_URI?.trim()),
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

    httpServer.listen(PORT, "0.0.0.0", () => {
      logger.info({ type: "startup", port: PORT }, `Server running on port ${PORT}`);
      logger.info({ type: "startup" }, "WebSocket ready at /socket.io");
    });
  } catch (error) {
    logger.fatal({ type: "startup", err: error.stack || error.message }, "Failed to start server");
    process.exit(1);
  }
};

startServer();
