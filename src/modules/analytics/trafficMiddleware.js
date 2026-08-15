import jwt from "jsonwebtoken";
import { insertTrafficLog } from "./trafficLogModel.js";
import { broadcastTrafficUpdate } from "./activityBroadcastService.js";
import { logger } from "../../config/logger.js";

const SKIP_PATHS = new Set(["/", "/health", "/ready"]);

function extractUserId(req) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) return null;
    const token = header.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded?.id ?? null;
  } catch {
    return null;
  }
}

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    return forwarded.split(",")[0].trim();
  }
  return req.socket?.remoteAddress ?? null;
}

export default function trafficMiddleware(req, res, next) {
  if (SKIP_PATHS.has(req.path)) {
    return next();
  }

  const startedAt = req.startedAt || Date.now();
  const userId = extractUserId(req);

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    const path = req.originalUrl?.split("?")[0] || req.path;

    insertTrafficLog({
      userId: req.user?.id ?? userId,
      method: req.method,
      path,
      statusCode: res.statusCode,
      durationMs,
      ip: getClientIp(req),
      userAgent: req.headers["user-agent"] ?? null,
    })
      .then((saved) =>
        broadcastTrafficUpdate({
          logId: saved.id,
          userId: req.user?.id ?? userId,
          method: req.method,
          path,
          statusCode: res.statusCode,
          durationMs,
          ip: getClientIp(req),
          userAgent: req.headers["user-agent"] ?? null,
          createdAt: saved.createdAt,
          requestId: req.requestId ?? null,
        }),
      )
      .catch((err) => {
        logger.error(
          { type: "traffic", err: err.message, requestId: req.requestId },
          "Traffic log insert failed",
        );
      });
  });

  next();
}
