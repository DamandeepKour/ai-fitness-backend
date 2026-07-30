import { formatJoiDetails } from "../utils/formatJoiDetails.js";

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

  if (statusCode >= 500) {
    console.error(err);
    if (process.env.NODE_ENV === "production") {
      message = "Internal server error";
      details = null;
    }
  } else {
    console.error(`[${statusCode}] ${message}`);
  }

  res.status(statusCode).json({
    success: false,
    statusCode,
    message,
    details,
  });
}
