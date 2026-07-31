import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";

export const requestContext = new AsyncLocalStorage();

export function getRequestContext() {
  return requestContext.getStore() ?? {};
}

export function getRequestId() {
  return getRequestContext().requestId ?? null;
}

export function createRequestId(incoming) {
  if (typeof incoming === "string" && incoming.trim()) {
    return incoming.trim().slice(0, 64);
  }
  return randomUUID();
}
