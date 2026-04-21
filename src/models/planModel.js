import db from "../config/db.js";

export const planTable = "plans";

export const planColumns = {
  id: "INT AUTO_INCREMENT PRIMARY KEY",
  user_id: "INT",
  goal: "VARCHAR(50)",
  calories: "INT",
  diet_plan: "JSON",
  workout_plan: "JSON",
  created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
};

export const syncPlanTable = async () => {
  const conn = await db(); // ✅ FIX

  const cols = Object.entries(planColumns)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");

  await conn.query(`CREATE TABLE IF NOT EXISTS ${planTable} (${cols})`);

  const [existing] = await conn.query(`SHOW COLUMNS FROM ${planTable}`);
  const existingCols = existing.map((c) => c.Field);

  for (const col in planColumns) {
    if (!existingCols.includes(col)) {
      await conn.query(
        `ALTER TABLE ${planTable} ADD COLUMN ${col} ${planColumns[col]}`
      );
    }
  }
};