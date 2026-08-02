import db from "./db.js";
import { getRedis } from "./redis.js";
import { isMongoConfigured, isMongoReady } from "./mongo.js";
import { AI_CONFIG } from "../ai/config.js";
import { logger } from "./logger.js";

const startedAt = Date.now();

function envInt(name, fallback) {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

const CHECK_TIMEOUT_MS = envInt("HEALTH_CHECK_TIMEOUT_MS", 4000);

function withTimeout(promise, ms, label) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    }),
  ]);
}

function checkResult(status, extras = {}) {
  return { status, ...extras };
}

async function checkMysql() {
  const started = Date.now();
  try {
    const conn = await withTimeout(db(), CHECK_TIMEOUT_MS, "MySQL connect");
    await withTimeout(conn.query("SELECT 1 AS ok"), CHECK_TIMEOUT_MS, "MySQL ping");
    return checkResult("up", {
      latencyMs: Date.now() - started,
      configured: true,
    });
  } catch (err) {
    logger.warn({ type: "health", check: "mysql", err: err.message }, "MySQL health check failed");
    return checkResult("down", {
      latencyMs: Date.now() - started,
      configured: Boolean(process.env.DB_HOST || process.env.MYSQL_PUBLIC_URL || process.env.MYSQL_URL),
      error: "database_unreachable",
    });
  }
}

async function checkAi() {
  const started = Date.now();
  const provider = AI_CONFIG.provider || "groq";
  const model = AI_CONFIG.model;
  const apiKeyConfigured = Boolean(process.env.GROQ_API_KEY?.trim());

  if (!apiKeyConfigured) {
    return checkResult("down", {
      latencyMs: Date.now() - started,
      provider,
      model,
      configured: false,
      error: "ai_api_key_missing",
    });
  }

  try {
    // Lightweight connectivity probe — list models, no generation tokens.
    const Groq = (await import("groq-sdk")).default;
    const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
    const models = await withTimeout(client.models.list(), CHECK_TIMEOUT_MS, "AI provider");
    const modelCount = Array.isArray(models?.data) ? models.data.length : null;

    return checkResult("up", {
      latencyMs: Date.now() - started,
      provider,
      model,
      configured: true,
      ...(modelCount != null ? { modelsVisible: modelCount > 0 } : {}),
    });
  } catch (err) {
    logger.warn({ type: "health", check: "ai", err: err.message }, "AI health check failed");
    return checkResult("down", {
      latencyMs: Date.now() - started,
      provider,
      model,
      configured: true,
      error: "ai_unreachable",
    });
  }
}

async function checkRedis() {
  const started = Date.now();
  const configured = Boolean(process.env.REDIS_URL?.trim());
  if (!configured) {
    return checkResult("skipped", { configured: false, required: false });
  }

  try {
    const redis = getRedis();
    if (!redis) {
      return checkResult("down", {
        latencyMs: Date.now() - started,
        configured: true,
        required: false,
        error: "redis_client_unavailable",
      });
    }

    const pong = await withTimeout(redis.ping(), CHECK_TIMEOUT_MS, "Redis ping");
    return checkResult(pong === "PONG" || pong === "pong" ? "up" : "down", {
      latencyMs: Date.now() - started,
      configured: true,
      required: false,
    });
  } catch (err) {
    logger.warn({ type: "health", check: "redis", err: err.message }, "Redis health check failed");
    return checkResult("down", {
      latencyMs: Date.now() - started,
      configured: true,
      required: false,
      error: "redis_unreachable",
    });
  }
}

async function checkMongo() {
  const started = Date.now();
  if (!isMongoConfigured()) {
    return checkResult("skipped", { configured: false, required: false });
  }

  const ready = isMongoReady();
  return checkResult(ready ? "up" : "down", {
    latencyMs: Date.now() - started,
    configured: true,
    required: false,
    ...(ready ? {} : { error: "mongo_not_connected" }),
  });
}

/**
 * Liveness: process is up and serving HTTP.
 * Always succeeds unless the process itself is unhealthy.
 */
export function getLivenessStatus() {
  return {
    status: "ok",
    service: "ai-fitness-backend",
    check: "liveness",
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || "1.0.0",
    env: process.env.NODE_ENV || "development",
  };
}

/**
 * Readiness: critical dependencies (MySQL + AI) are reachable.
 * Optional deps (Redis, Mongo) are reported but do not fail readiness unless required.
 */
export async function getReadinessStatus() {
  const [mysql, ai, redis, mongo] = await Promise.all([
    checkMysql(),
    checkAi(),
    checkRedis(),
    checkMongo(),
  ]);

  const criticalOk = mysql.status === "up" && ai.status === "up";
  const optionalDown = [redis, mongo].some((c) => c.status === "down");

  let status = "ok";
  if (!criticalOk) status = "error";
  else if (optionalDown) status = "degraded";

  return {
    status,
    service: "ai-fitness-backend",
    check: "readiness",
    ready: criticalOk,
    uptimeSeconds: Math.floor((Date.now() - startedAt) / 1000),
    timestamp: new Date().toISOString(),
    checks: {
      mysql,
      ai,
      redis,
      mongo,
    },
  };
}
