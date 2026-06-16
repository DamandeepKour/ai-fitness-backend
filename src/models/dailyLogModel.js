import db from "../config/db.js";

export const dailyLogTable = "daily_logs";

export const dailyLogColumns = {
  id: "INT AUTO_INCREMENT PRIMARY KEY",
  user_id: "INT NOT NULL",
  meal_type: "ENUM('morning_drink','breakfast','mid_morning_snack','lunch','dinner','evening_snack','after_dinner') NOT NULL",
  food_name: "VARCHAR(255) NOT NULL",
  calories: "INT NOT NULL",
  protein: "INT DEFAULT 0",
  carbs: "INT DEFAULT 0",
  fat: "INT DEFAULT 0",
  log_date: "DATE NOT NULL",
  created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
};

const normalizeExistingMealTypes = async (conn) => {
  await conn.query(`ALTER TABLE ${dailyLogTable} MODIFY COLUMN meal_type VARCHAR(50) NOT NULL`);

  await conn.query(`
    UPDATE ${dailyLogTable}
    SET meal_type = CASE LOWER(REPLACE(REPLACE(TRIM(meal_type), ' ', '_'), '-', '_'))
      WHEN 'morning_drink' THEN 'morning_drink'
      WHEN 'early_morning_drink' THEN 'morning_drink'
      WHEN 'breakfast' THEN 'breakfast'
      WHEN 'mid_morning_snack' THEN 'mid_morning_snack'
      WHEN 'mid_morning' THEN 'mid_morning_snack'
      WHEN 'lunch' THEN 'lunch'
      WHEN 'snack' THEN 'evening_snack'
      WHEN 'snacks' THEN 'evening_snack'
      WHEN 'evening_snack' THEN 'evening_snack'
      WHEN 'dinner' THEN 'dinner'
      WHEN 'after_dinner' THEN 'after_dinner'
      WHEN 'after_dinner_drink' THEN 'after_dinner'
      WHEN 'cheat_meal' THEN 'dinner'
      ELSE 'evening_snack'
    END
  `);
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

  try {
    await normalizeExistingMealTypes(conn);
    await conn.query(
      `ALTER TABLE ${dailyLogTable} MODIFY COLUMN meal_type ${dailyLogColumns.meal_type}`
    );
  } catch (e) {
    console.warn(`⚠️ Unable to update ${dailyLogTable}.meal_type enum:`, e.message);
  }

  // ✅ INDEX (safe version without IF NOT EXISTS)
  try {
    await conn.query(
      `CREATE INDEX idx_user_date ON ${dailyLogTable} (user_id, log_date)`
    );
  } catch (e) {}

  // Allow multiple logs per day (same meal type). Drop legacy unique index if present.
  try {
    await conn.query(`ALTER TABLE ${dailyLogTable} DROP INDEX unique_user_meal`);
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