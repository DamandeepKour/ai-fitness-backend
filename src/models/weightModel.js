import db from "../config/db.js";

export const weightTable = "weight_logs";

export const weightColumns = {
  id: "INT AUTO_INCREMENT PRIMARY KEY",
  user_id: "INT NOT NULL",
  weight: "FLOAT NOT NULL",
  log_date: "DATE NOT NULL",
  created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
};

export const syncWeightTable = async () => {
  const conn = await db();

  const cols = Object.entries(weightColumns)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");

  await conn.query(
    `CREATE TABLE IF NOT EXISTS ${weightTable} (${cols})`
  );

  const [existing] = await conn.query(
    `SHOW COLUMNS FROM ${weightTable}`
  );

  const existingCols = existing.map((c) => c.Field);

  for (const col in weightColumns) {
    if (!existingCols.includes(col)) {
      await conn.query(
        `ALTER TABLE ${weightTable} ADD COLUMN ${col} ${weightColumns[col]}`
      );
    }
  }
};