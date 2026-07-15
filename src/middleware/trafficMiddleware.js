import jwt from "jsonwebtoken";
import { insertTrafficLog } from "../models/trafficLogModel.js";
import { broadcastTrafficUpdate } from "../services/activityBroadcastService.js";

const SKIP_PATHS = new Set(["/", "/health"]);

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

  const startedAt = Date.now();
  const userId = extractUserId(req);

  res.on("finish", () => {
    const durationMs = Date.now() - startedAt;
    const path = req.originalUrl?.split("?")[0] || req.path;

    insertTrafficLog({
      userId,
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
          userId,
          method: req.method,
          path,
          statusCode: res.statusCode,
          durationMs,
          ip: getClientIp(req),
          userAgent: req.headers["user-agent"] ?? null,
          createdAt: saved.createdAt,
        }),
      )
      .catch((err) => {
        console.error("Traffic log insert failed:", err.message);
      });
  });

  next();
}
