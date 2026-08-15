import db from "../../config/db.js";

export const userStreakTable = "user_streaks";

export const userStreakColumns = {
  id: "INT AUTO_INCREMENT PRIMARY KEY",
  user_id: "INT NOT NULL UNIQUE",
  current_streak: "INT NOT NULL DEFAULT 0",
  longest_streak: "INT NOT NULL DEFAULT 0",
  last_log_date: "DATE NULL",
  updated_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
  created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
};

export async function syncUserStreakTable() {
  const conn = await db();
  const cols = Object.entries(userStreakColumns)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");

  await conn.query(`CREATE TABLE IF NOT EXISTS ${userStreakTable} (${cols})`);

  const [existing] = await conn.query(`SHOW COLUMNS FROM ${userStreakTable}`);
  const existingCols = existing.map((c) => c.Field);

  for (const col in userStreakColumns) {
    if (!existingCols.includes(col)) {
      await conn.query(
        `ALTER TABLE ${userStreakTable} ADD COLUMN ${col} ${userStreakColumns[col]}`,
      );
    }
  }
}
