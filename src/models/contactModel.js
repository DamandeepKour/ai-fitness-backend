import db from "../config/db.js";

export const contactTable = "contact_messages";

export const contactColumns = {
  id: "INT AUTO_INCREMENT PRIMARY KEY",
  name: "VARCHAR(150) NOT NULL",
  email: "VARCHAR(255) NOT NULL",
  message: "TEXT NOT NULL",
  status: "ENUM('open','in_progress','resolved') DEFAULT 'open'",
  created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
  updated_at: "TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP",
};

export const syncContactTable = async () => {
  const conn = await db();

  const cols = Object.entries(contactColumns)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");

  await conn.query(`CREATE TABLE IF NOT EXISTS ${contactTable} (${cols})`);

  const [existing] = await conn.query(`SHOW COLUMNS FROM ${contactTable}`);
  const existingCols = existing.map((c) => c.Field);

  for (const col in contactColumns) {
    if (!existingCols.includes(col)) {
      await conn.query(
        `ALTER TABLE ${contactTable} ADD COLUMN ${col} ${contactColumns[col]}`,
      );
    }
  }
};
