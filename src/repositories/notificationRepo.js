import db from "../config/db.js";
import { notificationPrefsTable } from "../models/premiumModel.js";

export const findNotificationPrefsByUserId = async (userId) => {
  const conn = await db();
  const [rows] = await conn.query(
    `SELECT * FROM ${notificationPrefsTable} WHERE user_id = ? LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
};

export const createNotificationPrefs = async (userId) => {
  const conn = await db();
  await conn.query(`INSERT INTO ${notificationPrefsTable} (user_id) VALUES (?)`, [userId]);
  return findNotificationPrefsByUserId(userId);
};

export const updateNotificationPrefs = async (userId, updates) => {
  const conn = await db();
  const fields = Object.keys(updates);
  const values = Object.values(updates);

  await conn.query(
    `UPDATE ${notificationPrefsTable}
     SET ${fields.map((field) => `${field} = ?`).join(", ")}
     WHERE user_id = ?`,
    [...values, userId],
  );

  return findNotificationPrefsByUserId(userId);
};
