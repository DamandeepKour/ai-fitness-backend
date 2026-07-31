import { formatJoiDetails } from "../utils/formatJoiDetails.js";
import { logger } from "../config/logger.js";
import { getRequestContext } from "../context/requestContext.js";

export default function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = Number(err.statusCode) || 500;
  let message = err.message || "Server Error";
  let details = err.details ?? null;

  if (err.isJoi) {
    statusCode = 400;
    message = "Validation failed";
    details = formatJoiDetails(err);
  }

  if (err instanceof SyntaxError && "body" in err) {
    statusCode = 400;
    message = "Invalid JSON body";
    details = [{ field: "body", message: "Request body must be valid JSON" }];
  }

  if (err.code === "ER_DUP_ENTRY") {
    statusCode = 409;
    message = "Resource already exists";
  }

  if (statusCode === 429 || statusCode === 529) {
    message = err.message || "Too many requests. Please try again later.";
  }

  const ctx = getRequestContext();
  const requestId = req.requestId ?? ctx.requestId ?? null;
  const logPayload = {
    type: "error",
    requestId,
    userId: req.user?.id ?? ctx.userId ?? null,
    route: req.originalUrl?.split("?")[0] || req.path,
    method: req.method,
    statusCode,
    code: err.code ?? null,
    err: statusCode >= 500 ? err.stack || err.message : err.message,
  };

  if (statusCode >= 500 && statusCode !== 529) {
    logger.error(logPayload, message);
    if (process.env.NODE_ENV === "production") {
      message = "Internal server error";
      details = null;
    }
  } else {
    logger.warn(logPayload, message);
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    code: err.code ?? null,
    details,
    requestId,
  });
}
