import db from "../config/db.js";

export const saveUserHistory = async (data) => {
  const conn = await db();

  const query = `
    INSERT INTO user_history
    (user_id, field_name, old_value, new_value)
    VALUES (?, ?, ?, ?)
  `;

  await conn.query(query, [
    data.user_id,
    data.field_name,
    data.old_value,
    data.new_value,
  ]);
};