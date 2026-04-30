import db from "../config/db.js";

export const userHistoryTable = "user_history";

export const userHistoryColumns = {
  id: "INT AUTO_INCREMENT PRIMARY KEY",
  user_id: "INT",
  field_name: "VARCHAR(50)",
  old_value: "TEXT",
  new_value: "TEXT",
  changed_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
};

export const syncUserHistoryTable = async () => {
  const conn = await db();

  const cols = Object.entries(userHistoryColumns)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");

  await conn.query(
    `CREATE TABLE IF NOT EXISTS ${userHistoryTable} (${cols})`
  );
};