import dotenv from "dotenv";
dotenv.config();

import { hydrateDbEnvFromProvider } from "../config/db.js";
hydrateDbEnvFromProvider();

import { validateEnv } from "../config/env.js";
import { logger } from "../config/logger.js";
import { connectRedis } from "../config/redis.js";
import { connectMongo } from "../config/mongo.js";
import initDb from "../../initDb.js";
import { startFitnovaWorker, stopFitnovaWorker } from "./worker.js";

try {
  validateEnv({ requireAi: false });
} catch (err) {
  console.error("❌", err.message);
  process.exit(1);
}

async function main() {
  logger.info({ type: "jobs" }, "Starting FitNova worker process...");
  await initDb();
  await connectRedis();
  await connectMongo();

  const worker = startFitnovaWorker();
  if (!worker) {
    logger.fatal({ type: "jobs" }, "Worker failed to start (REDIS_URL missing?)");
    process.exit(1);
  }

  const shutdown = async (signal) => {
    logger.info({ type: "jobs", signal }, "Shutting down worker");
    await stopFitnovaWorker();
    process.exit(0);
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.fatal({ type: "jobs", err: err.stack || err.message }, "Worker process failed");
  process.exit(1);
});
