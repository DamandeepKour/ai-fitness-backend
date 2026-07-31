import IORedis from "ioredis";
import { logger } from "../config/logger.js";

let sharedConnection = null;

/**
 * BullMQ requires maxRetriesPerRequest: null on the Redis connection.
 */
export function createBullConnection() {
  const url = process.env.REDIS_URL?.trim();
  if (!url) {
    throw new Error("REDIS_URL is required for the FitNova job queue");
  }

  const opts = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
  };

  if (url.startsWith("rediss://")) {
    opts.tls = {};
  }

  return new IORedis(url, opts);
}

export function getBullConnection() {
  if (!sharedConnection) {
    sharedConnection = createBullConnection();
    sharedConnection.on("error", (err) => {
      logger.error({ type: "jobs", err: err.message }, "BullMQ Redis error");
    });
  }
  return sharedConnection;
}

export function isQueueEnabled() {
  return Boolean(process.env.REDIS_URL?.trim());
}
