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

import http from "http";
import initDb from "./initDb.js";
import { createApp, API_VERSION } from "./src/app.js";
import { connectRedis } from "./src/config/redis.js";
import { connectMongo } from "./src/config/mongo.js";
import { initSocket } from "./src/config/socket.js";
import { registerGracefulShutdown } from "./src/config/shutdown.js";
import { startVerificationCleanupJob } from "./src/jobs/verificationCleanupJob.js";
import { startFitnovaWorker } from "./src/jobs/worker.js";
import { startJobSchedulers } from "./src/jobs/schedulers.js";

const app = createApp();
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
