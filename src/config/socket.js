import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import db from "./db.js";

let io = null;

const SUPERADMIN_ROOM = "superadmin:activity";

export function initSocket(httpServer) {
  const allowedOrigins = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  io = new Server(httpServer, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    path: "/socket.io",
  });

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) {
        return next(new Error("Unauthorized"));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const conn = await db();
      const [rows] = await conn.query(
        "SELECT id, user_type FROM users WHERE id = ? LIMIT 1",
        [decoded.id],
      );
      const user = rows[0];

      if (!user || user.user_type !== "superadmin") {
        return next(new Error("Forbidden"));
      }

      socket.data.userId = user.id;
      return next();
    } catch {
      return next(new Error("Unauthorized"));
    }
  });

  io.on("connection", (socket) => {
    socket.join(SUPERADMIN_ROOM);
    socket.emit("monitor:connected", { ok: true });

    socket.on("disconnect", () => {
      socket.leave(SUPERADMIN_ROOM);
    });
  });

  return io;
}

export function getIO() {
  return io;
}

export function emitToSuperadmin(event, payload) {
  if (!io) return;
  io.to(SUPERADMIN_ROOM).emit(event, payload);
}
