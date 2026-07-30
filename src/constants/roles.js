export const ROLES = {
  USER: "user",
  ADMIN: "admin",
  SUPERADMIN: "superadmin",
  STAFF: "staff",
  COACH: "coach",
};

/** Roles that grant full admin console access (legacy superadmin included). */
export const ADMIN_ROLE_SET = new Set([ROLES.ADMIN, ROLES.SUPERADMIN]);

/** Roles that can access coach review workflows. */
export const COACH_ROLE_SET = new Set([ROLES.COACH, ROLES.STAFF]);

export const PERMISSIONS = {
  ANALYTICS_READ: "analytics:read",
  USERS_MANAGE: "users:manage",
  SYSTEM_READ: "system:read",
  COACH_REVIEWS_MANAGE: "coach-reviews:manage",
};

const PERMISSION_ROLE_MAP = {
  [PERMISSIONS.ANALYTICS_READ]: [ROLES.ADMIN],
  [PERMISSIONS.USERS_MANAGE]: [ROLES.ADMIN],
  [PERMISSIONS.SYSTEM_READ]: [ROLES.ADMIN],
  [PERMISSIONS.COACH_REVIEWS_MANAGE]: [ROLES.ADMIN, ROLES.COACH],
};

export function normalizeRole(role) {
  return String(role || ROLES.USER).toLowerCase().trim();
}

export function isAdminRole(role) {
  return ADMIN_ROLE_SET.has(normalizeRole(role));
}

export function isCoachRole(role) {
  return COACH_ROLE_SET.has(normalizeRole(role));
}

export function roleMatches(actualRole, allowedRoles = []) {
  const normalized = normalizeRole(actualRole);

  return allowedRoles.some((allowed) => {
    const key = normalizeRole(allowed);

    if (key === ROLES.ADMIN) {
      return isAdminRole(normalized);
    }

    if (key === ROLES.COACH) {
      return isCoachRole(normalized) || isAdminRole(normalized);
    }

    return normalized === key;
  });
}

export function getRolesForPermission(permission) {
  return PERMISSION_ROLE_MAP[permission] || null;
}

export function isAllowedUserType(userType) {
  const normalized = normalizeRole(userType);
  return Object.values(ROLES).includes(normalized);
}
