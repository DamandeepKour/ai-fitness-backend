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

const app = express();

// Required for accurate client IPs behind Render/Railway (rate limiting).
app.set("trust proxy", 1);

app.use(cors());
app.use(express.json());
app.use(requestContextMiddleware);

app.get("/", (req, res) => {
  res.send("API is running 🚀");
});

app.get("/health", async (req, res) => {
  res.json({ ok: true, service: "ai-fitness-backend" });
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
