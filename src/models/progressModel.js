import db from "../config/db.js";

export const progressTable = "progress";

export const progressColumns = {
  id: "INT AUTO_INCREMENT PRIMARY KEY",
  user_id: "INT",
  weight: "FLOAT",
  date: "DATE",
  notes: "TEXT",
};

export const syncProgressTable = async () => {
  const conn = await db(); // ✅

  const cols = Object.entries(progressColumns)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");

  await conn.query(`CREATE TABLE IF NOT EXISTS ${progressTable} (${cols})`);

  const [existing] = await conn.query(`SHOW COLUMNS FROM ${progressTable}`);
  const existingCols = existing.map((c) => c.Field);

  for (const col in progressColumns) {
    if (!existingCols.includes(col)) {
      await conn.query(
        `ALTER TABLE ${progressTable} ADD COLUMN ${col} ${progressColumns[col]}`
      );
    }
  }
};