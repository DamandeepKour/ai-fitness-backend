import { isMongoReady } from "../../config/mongo.js";
import { logger } from "../../config/logger.js";
import { getRequestContext } from "../../context/requestContext.js";
import AiAuditLog from "./aiAuditLog.js";

/**
 * Persist an AI audit document to MongoDB (no-op when Mongo is unavailable).
 */
export async function insertAiAuditLog(entry) {
  if (!isMongoReady()) {
    return null;
  }

  const ctx = getRequestContext();

  try {
    const doc = await AiAuditLog.create({
      requestId: entry.requestId ?? ctx.requestId ?? null,
      userId: entry.userId ?? null,
      feature: entry.feature,
      promptVersion: entry.promptVersion,
      model: entry.model ?? null,
      status: entry.status,
      latencyMs: entry.latencyMs ?? 0,
      attempts: entry.attempts ?? 1,
      usedFallback: Boolean(entry.usedFallback),
      errorMessage: entry.errorMessage ?? null,
      promptTokens: entry.promptTokens ?? null,
      completionTokens: entry.completionTokens ?? null,
      route: entry.route ?? ctx.route ?? null,
      metadata: entry.metadata ?? null,
    });
    return doc;
  } catch (err) {
    logger.error(
      { type: "ai_audit", err: err.message, requestId: entry.requestId ?? ctx.requestId },
      "Failed to write AI audit log to MongoDB",
    );
    return null;
  }
}
