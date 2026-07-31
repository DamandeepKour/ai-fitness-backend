import mongoose from "mongoose";
import { logger } from "./logger.js";

let connecting = null;

export function isMongoConfigured() {
  return Boolean(process.env.MONGODB_URI?.trim());
}

export function isMongoReady() {
  return mongoose.connection.readyState === 1;
}

/**
 * Connect to MongoDB when MONGODB_URI is set (optional — app runs without it).
 * Used for AI audit logs and FitNova analytics aggregations.
 */
export async function connectMongo() {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    logger.warn({ type: "mongo" }, "MONGODB_URI not set — AI audit logs will skip MongoDB");
    return null;
  }

  if (isMongoReady()) {
    return mongoose.connection;
  }

  if (connecting) {
    return connecting;
  }

  connecting = mongoose
    .connect(uri, {
      serverSelectionTimeoutMS: Number(process.env.MONGODB_TIMEOUT_MS || 10_000),
    })
    .then(() => {
      logger.info({ type: "mongo" }, "MongoDB connected");
      return mongoose.connection;
    })
    .catch((err) => {
      logger.error({ type: "mongo", err: err.message }, "MongoDB connect failed");
      connecting = null;
      return null;
    });

  return connecting;
}

export function getMongoose() {
  return mongoose;
}
