import Groq from "groq-sdk";
import { AI_CONFIG } from "../config.js";
import { isAiRateLimitError, normalizeAiProviderError } from "../utils/aiErrors.js";

let groqClient = null;

function getGroqClient() {
  if (!groqClient) {
    groqClient = new Groq({ apiKey: process.env.GROQ_API_KEY });
  }
  return groqClient;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, timeoutMs) {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => reject(new Error(`AI request timed out after ${timeoutMs}ms`)), timeoutMs);
    }),
  ]);
}

export async function createChatCompletion({
  messages,
  model = AI_CONFIG.model,
  responseFormat = null,
  timeoutMs = AI_CONFIG.timeoutMs,
}) {
  const client = getGroqClient();

  const payload = {
    model,
    messages,
  };

  if (responseFormat) {
    payload.response_format = responseFormat;
  }

  return withTimeout(client.chat.completions.create(payload), timeoutMs);
}

export async function createChatCompletionWithRetry({
  messages,
  model = AI_CONFIG.model,
  responseFormat = null,
  timeoutMs = AI_CONFIG.timeoutMs,
  maxRetries = AI_CONFIG.maxRetries,
  retryDelayMs = AI_CONFIG.retryDelayMs,
}) {
  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt += 1) {
    try {
      const response = await createChatCompletion({
        messages,
        model,
        responseFormat,
        timeoutMs,
      });

      return { response, attempts: attempt + 1 };
    } catch (err) {
      if (isAiRateLimitError(err)) {
        throw normalizeAiProviderError(err);
      }

      lastError = err;
      if (attempt < maxRetries) {
        await sleep(retryDelayMs * (attempt + 1));
      }
    }
  }

  throw lastError;
}

export function extractCompletionContent(response) {
  return response?.choices?.[0]?.message?.content ?? "";
}

export function extractTokenUsage(response) {
  return {
    promptTokens: response?.usage?.prompt_tokens ?? null,
    completionTokens: response?.usage?.completion_tokens ?? null,
  };
}
