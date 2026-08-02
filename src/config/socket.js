import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import { isAdminRole, normalizeRole } from "../constants/roles.js";
import { getUserRoleById } from "../repositories/roleRepository.js";
import { getAllowedCorsOrigins } from "./env.js";

let io = null;

const SUPERADMIN_ROOM = "superadmin:activity";

export function initSocket(httpServer) {
  const allowedOrigins = getAllowedCorsOrigins();

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
      const role = await getUserRoleById(decoded.id);

      if (!decoded.id || !isAdminRole(role)) {
        return next(new Error("Forbidden"));
      }

      socket.data.userId = decoded.id;
      socket.data.userRole = normalizeRole(role);
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
