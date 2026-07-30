import { AppError } from "../../utils/AppError.js";

export const AI_RATE_LIMIT_CODE = "AI_RATE_LIMIT";

export const AI_RATE_LIMIT_MESSAGE =
  "Our AI is handling too many requests right now. Please wait a moment and try again.";

export function extractHttpStatus(err) {
  return (
    err?.status
    ?? err?.statusCode
    ?? err?.response?.status
    ?? err?.error?.status
    ?? err?.cause?.status
    ?? null
  );
}

export function isAiRateLimitError(err) {
  const status = Number(extractHttpStatus(err));
  if (status === 429 || status === 529) return true;

  const message = String(err?.message || err?.error?.message || "").toLowerCase();
  return (
    message.includes("rate limit")
    || message.includes("too many requests")
    || message.includes("overloaded")
    || message.includes("capacity")
  );
}

export function createAiRateLimitError(sourceError = null) {
  const status = Number(extractHttpStatus(sourceError));
  const statusCode = status === 529 ? 529 : 429;

  return new AppError(AI_RATE_LIMIT_MESSAGE, statusCode, null, AI_RATE_LIMIT_CODE);
}

export function normalizeAiProviderError(err) {
  if (isAiRateLimitError(err)) {
    return createAiRateLimitError(err);
  }
  return err;
}
