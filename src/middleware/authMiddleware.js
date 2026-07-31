import jwt from "jsonwebtoken";
import { getRedis } from "../config/redis.js";
import { getRequestContext } from "../context/requestContext.js";
import { AppError } from "../utils/AppError.js";

const authMiddleware = async (req, res, next) => {
  try {
    const header = req.headers.authorization;

    if (!header) {
      throw new AppError("No token provided", 401);
    }

    const token = header.split(" ")[1];

    const redis = getRedis();
    if (redis) {
      const isBlacklisted = await redis.get(`blacklist:${token}`);
      if (isBlacklisted) {
        throw new AppError("Token expired (logged out)", 401);
      }
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;

    const ctx = getRequestContext();
    if (ctx && decoded?.id != null) {
      ctx.userId = decoded.id;
    }

    next();
  } catch (err) {
    if (err instanceof AppError) {
      return next(err);
    }

    return next(new AppError("Invalid token", 401));
  }
};

export default authMiddleware;
