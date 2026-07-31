import { createRequestId, requestContext } from "../context/requestContext.js";

function extractUserId(req) {
  return req.user?.id ?? req.user?.userId ?? null;
}

/**
 * Assigns requestId, stores ALS context, and exposes x-request-id.
 * Must run early in the middleware stack.
 */
export default function requestContextMiddleware(req, res, next) {
  const requestId = createRequestId(req.headers["x-request-id"]);
  const startedAt = Date.now();
  const route = req.originalUrl?.split("?")[0] || req.path;

  req.requestId = requestId;
  req.startedAt = startedAt;
  res.setHeader("x-request-id", requestId);

  const store = {
    requestId,
    method: req.method,
    route,
    startedAt,
    userId: extractUserId(req),
  };

  requestContext.run(store, () => next());
}
