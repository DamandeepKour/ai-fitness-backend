import db from "../config/db.js";

export const dailyLogTable = "daily_logs";

export const dailyLogColumns = {
  id: "INT AUTO_INCREMENT PRIMARY KEY",
  user_id: "INT NOT NULL",
  meal_type: "ENUM('breakfast','lunch','dinner','snack') NOT NULL",
  food_name: "VARCHAR(255) NOT NULL",
  calories: "INT NOT NULL",
  protein: "INT DEFAULT 0",
  carbs: "INT DEFAULT 0",
  fat: "INT DEFAULT 0",
  log_date: "DATE NOT NULL",
  created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
};

export const syncDailyLogTable = async () => {
  const conn = await db();

  const cols = Object.entries(dailyLogColumns)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");

  // ✅ Create table
  await conn.query(
    `CREATE TABLE IF NOT EXISTS ${dailyLogTable} (${cols})`
  );

  // ✅ Get existing columns
  const [existing] = await conn.query(
    `SHOW COLUMNS FROM ${dailyLogTable}`
  );

  const existingCols = existing.map((c) => c.Field);

  // ✅ Add missing columns
  for (const col in dailyLogColumns) {
    if (!existingCols.includes(col)) {
      await conn.query(
        `ALTER TABLE ${dailyLogTable} ADD COLUMN ${col} ${dailyLogColumns[col]}`
      );
    }
  }

  // ✅ INDEX (safe version without IF NOT EXISTS)
  try {
    await conn.query(
      `CREATE INDEX idx_user_date ON ${dailyLogTable} (user_id, log_date)`
    );
  } catch (e) {}

  // ✅ UNIQUE (prevent duplicate meal)
  try {
    await conn.query(
      `CREATE UNIQUE INDEX unique_user_meal 
       ON ${dailyLogTable} (user_id, meal_type, log_date)`
    );
  } catch (e) {}

  // ✅ FOREIGN KEY (optional)
  try {
    await conn.query(`
      ALTER TABLE ${dailyLogTable}
      ADD CONSTRAINT fk_user_dailylog
      FOREIGN KEY (user_id) REFERENCES users(id)
      ON DELETE CASCADE
    `);
  } catch (e) {}
};