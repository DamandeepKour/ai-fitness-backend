import { AI_CONFIG } from "../config.js";
import { insertAiRequestLog } from "./aiRequestLogModel.js";

export async function logAiMetadata(entry) {
  const payload = {
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
    metadata: entry.metadata ?? null,
  };

  if (!AI_CONFIG.logToDatabase) {
    console.info("[FitNova AI]", JSON.stringify(payload));
    return;
  }

  try {
    await insertAiRequestLog(payload);
  } catch (err) {
    console.error("AI metadata log failed:", err.message);
  }
}
