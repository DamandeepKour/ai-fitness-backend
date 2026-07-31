import { logger } from "../config/logger.js";

/**
 * Structured HTTP access log for every API request (requestId, userId, route, latency, status).
 */
export default function requestLoggerMiddleware(req, res, next) {
  const startedAt = req.startedAt || Date.now();

  res.on("finish", () => {
    const latencyMs = Date.now() - startedAt;
    const route = req.originalUrl?.split("?")[0] || req.path;
    const statusCode = res.statusCode;
    const status = statusCode >= 500 ? "error" : statusCode >= 400 ? "failure" : "success";

    const payload = {
      type: "http",
      requestId: req.requestId ?? null,
      userId: req.user?.id ?? null,
      route,
      method: req.method,
      latencyMs,
      status,
      statusCode,
    };

    if (statusCode >= 500) {
      logger.error(payload, `${req.method} ${route} ${statusCode}`);
    } else if (statusCode >= 400) {
      logger.warn(payload, `${req.method} ${route} ${statusCode}`);
    } else {
      logger.info(payload, `${req.method} ${route} ${statusCode}`);
    }
  });

  next();
}
