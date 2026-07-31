import { AI_CONFIG } from "../config.js";
import { logger } from "../../config/logger.js";
import { getRequestContext } from "../../context/requestContext.js";
import { insertAiRequestLog } from "./aiRequestLogModel.js";
import { insertAiAuditLog } from "../../models/mongo/aiAuditLogService.js";

export async function logAiMetadata(entry) {
  const ctx = getRequestContext();
  const payload = {
    requestId: entry.requestId ?? ctx.requestId ?? null,
    userId: entry.userId ?? null,
    feature: entry.feature,
    promptVersion: entry.promptVersion,
    model: entry.model ?? AI_CONFIG.model,
    status: entry.status,
    latencyMs: entry.latencyMs ?? 0,
    attempts: entry.attempts ?? 1,
    usedFallback: Boolean(entry.usedFallback),
    errorMessage: entry.errorMessage ?? null,
    promptTokens: entry.promptTokens ?? null,
    completionTokens: entry.completionTokens ?? null,
    route: entry.route ?? ctx.route ?? null,
    metadata: entry.metadata ?? null,
  };

  logger.info(
    {
      type: "ai_audit",
      requestId: payload.requestId,
      userId: payload.userId,
      route: payload.route,
      feature: payload.feature,
      status: payload.status,
      latencyMs: payload.latencyMs,
      model: payload.model,
      usedFallback: payload.usedFallback,
    },
    `AI ${payload.feature} ${payload.status}`,
  );

  const writes = [];

  if (AI_CONFIG.logToDatabase) {
    writes.push(
      insertAiRequestLog(payload).catch((err) => {
        logger.error(
          { type: "ai_audit", err: err.message, requestId: payload.requestId },
          "AI metadata MySQL log failed",
        );
      }),
    );
  }

  // Always attempt Mongo AI audit when connected (primary durable AI audit store).
  writes.push(insertAiAuditLog(payload));

  await Promise.all(writes);
}
