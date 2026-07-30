import { AppError } from "../utils/AppError.js";
import { getRolesForPermission, roleMatches } from "../constants/roles.js";
import { getUserRoleById } from "../repositories/roleRepository.js";

async function resolveActorRole(req) {
  if (!req.user?.id) {
    throw new AppError("Unauthorized", 401);
  }

  const role = await getUserRoleById(req.user.id);
  req.userRole = role;
  req.user.user_type = role;
  return role;
}

export function requireRole(...allowedRoles) {
  return async (req, res, next) => {
    try {
      const role = await resolveActorRole(req);

      if (!roleMatches(role, allowedRoles)) {
        throw new AppError("Insufficient permissions", 403, [
          {
            field: "role",
            message: `Requires one of: ${allowedRoles.join(", ")}`,
          },
        ]);
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

export function requirePermission(permission) {
  const allowedRoles = getRolesForPermission(permission);

  if (!allowedRoles) {
    throw new Error(`Unknown permission: ${permission}`);
  }

  return requireRole(...allowedRoles);
}

export function requireSelfOrRole(paramName = "id", ...allowedRoles) {
  return async (req, res, next) => {
    try {
      if (!req.user?.id) {
        throw new AppError("Unauthorized", 401);
      }

      const targetId = Number(req.params[paramName]);
      const actorId = Number(req.user.id);

      if (Number.isFinite(targetId) && targetId === actorId) {
        req.userRole = await getUserRoleById(actorId);
        req.user.user_type = req.userRole;
        return next();
      }

      const role = await resolveActorRole(req);

      if (!roleMatches(role, allowedRoles)) {
        throw new AppError("Insufficient permissions", 403, [
          {
            field: "role",
            message: `Requires one of: ${allowedRoles.join(", ")}`,
          },
        ]);
      }

      return next();
    } catch (err) {
      return next(err);
    }
  };
}
