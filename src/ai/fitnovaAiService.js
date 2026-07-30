import { AI_CONFIG, AI_STATUS } from "../config.js";
import {
  createChatCompletionWithRetry,
  extractCompletionContent,
  extractTokenUsage,
} from "../client/groqProvider.js";
import { logAiMetadata } from "../metadata/logAiMetadata.js";
import { isAiRateLimitError, normalizeAiProviderError } from "../utils/aiErrors.js";
import { AppError } from "../../utils/AppError.js";

function parseResponseContent(content, parseJson) {
  if (!parseJson) return content;

  try {
    return JSON.parse(content);
  } catch (err) {
    const error = new Error("AI returned invalid JSON");
    error.cause = err;
    throw error;
  }
}

/**
 * Central FitNova AI execution wrapper.
 * Handles retries, timeout (via provider), fallback, and metadata logging.
 */
export async function runAiTask({
  feature,
  promptVersion,
  messages,
  userId = null,
  model = AI_CONFIG.model,
  responseFormat = null,
  parseJson = false,
  fallback,
  metadata = {},
}) {
  const startedAt = Date.now();
  let attempts = 0;
  let lastError = null;

  try {
    const result = await createChatCompletionWithRetry({
      messages,
      model,
      responseFormat,
    });

    attempts = result.attempts;
    const content = extractCompletionContent(result.response);
    const data = parseResponseContent(content, parseJson);
    const tokens = extractTokenUsage(result.response);
    const latencyMs = Date.now() - startedAt;

    await logAiMetadata({
      userId,
      feature,
      promptVersion,
      model,
      status: AI_STATUS.SUCCESS,
      latencyMs,
      attempts,
      usedFallback: false,
      ...tokens,
      metadata,
    });

    return {
      data,
      meta: {
        feature,
        promptVersion,
        model,
        usedFallback: false,
        attempts,
        latencyMs,
      },
    };
  } catch (err) {
    const normalizedError = err instanceof AppError
      ? err
      : normalizeAiProviderError(err);

    lastError = normalizedError;
    attempts = AI_CONFIG.maxRetries + 1;
    const latencyMs = Date.now() - startedAt;

    if (isAiRateLimitError(normalizedError)) {
      await logAiMetadata({
        userId,
        feature,
        promptVersion,
        model,
        status: AI_STATUS.ERROR,
        latencyMs,
        attempts,
        usedFallback: false,
        errorMessage: normalizedError.message,
        metadata: { ...metadata, rateLimited: true },
      });

      throw normalizedError;
    }

    if (typeof fallback === "function") {
      const data = fallback(normalizedError);

      await logAiMetadata({
        userId,
        feature,
        promptVersion,
        model,
        status: AI_STATUS.FALLBACK,
        latencyMs,
        attempts,
        usedFallback: true,
        errorMessage: normalizedError.message,
        metadata: { ...metadata, fallback: true },
      });

      return {
        data,
        meta: {
          feature,
          promptVersion,
          model,
          usedFallback: true,
          attempts,
          latencyMs,
          error: normalizedError.message,
        },
      };
    }

    await logAiMetadata({
      userId,
      feature,
      promptVersion,
      model,
      status: AI_STATUS.ERROR,
      latencyMs,
      attempts,
      usedFallback: false,
      errorMessage: normalizedError.message,
      metadata,
    });

    throw normalizedError;
  }
}

export { AI_CONFIG };
