import db from "../config/db.js";

export const pantryTable = "pantry_items";

export const pantryColumns = {
  id: "INT AUTO_INCREMENT PRIMARY KEY",
  user_id: "INT NOT NULL",
  ingredient: "VARCHAR(120) NOT NULL",
  qty: "VARCHAR(50) DEFAULT '1'",
  unit: "VARCHAR(30) DEFAULT 'portion'",
  created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
};

export async function syncPantryTable() {
  const conn = await db();
  const cols = Object.entries(pantryColumns)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");

  await conn.query(`CREATE TABLE IF NOT EXISTS ${pantryTable} (${cols})`);

  const [existing] = await conn.query(`SHOW COLUMNS FROM ${pantryTable}`);
  const existingCols = existing.map((c) => c.Field);

  for (const col in pantryColumns) {
    if (!existingCols.includes(col)) {
      await conn.query(`ALTER TABLE ${pantryTable} ADD COLUMN ${col} ${pantryColumns[col]}`);
    }
  }
}
