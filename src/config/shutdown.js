import { logger } from "./logger.js";
import { getRedis } from "./redis.js";
import { getMongoose, isMongoReady } from "./mongo.js";
import { closeDb } from "./db.js";
import { stopFitnovaWorker } from "../jobs/worker.js";

let shuttingDown = false;

/**
 * Register SIGTERM/SIGINT handlers for zero-downtime deploys.
 */
export function registerGracefulShutdown({ httpServer }) {
  const shutdown = async (signal) => {
    if (shuttingDown) return;
    shuttingDown = true;

    logger.info({ type: "shutdown", signal }, "Graceful shutdown started");

    const forceTimer = setTimeout(() => {
      logger.error({ type: "shutdown" }, "Forced exit after timeout");
      process.exit(1);
    }, Number(process.env.SHUTDOWN_TIMEOUT_MS || 15_000));
    forceTimer.unref?.();

    try {
      if (httpServer) {
        await new Promise((resolve) => {
          httpServer.close(() => resolve());
          // Stop accepting new connections immediately when supported.
          httpServer.closeIdleConnections?.();
        });
        logger.info({ type: "shutdown" }, "HTTP server closed");
      }

      await stopFitnovaWorker().catch((err) => {
        logger.warn({ type: "shutdown", err: err.message }, "Worker stop failed");
      });

      const redis = getRedis();
      if (redis) {
        try {
          await redis.quit();
          logger.info({ type: "shutdown" }, "Redis disconnected");
        } catch (err) {
          logger.warn({ type: "shutdown", err: err.message }, "Redis quit failed");
        }
      }

      if (isMongoReady()) {
        try {
          await getMongoose().disconnect();
          logger.info({ type: "shutdown" }, "MongoDB disconnected");
        } catch (err) {
          logger.warn({ type: "shutdown", err: err.message }, "Mongo disconnect failed");
        }
      }

      await closeDb().catch((err) => {
        logger.warn({ type: "shutdown", err: err.message }, "MySQL pool end failed");
      });

      logger.info({ type: "shutdown" }, "Graceful shutdown complete");
      process.exit(0);
    } catch (err) {
      logger.fatal({ type: "shutdown", err: err.stack || err.message }, "Shutdown failed");
      process.exit(1);
    }
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}
