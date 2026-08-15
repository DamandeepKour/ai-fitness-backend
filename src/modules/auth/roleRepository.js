import db from "../../config/db.js";
import { normalizeRole } from "./roles.js";

export async function getUserRoleById(userId) {
  const conn = await db();
  const [rows] = await conn.query(
    "SELECT user_type FROM users WHERE id = ? LIMIT 1",
    [userId],
  );

  return normalizeRole(rows[0]?.user_type);
}
