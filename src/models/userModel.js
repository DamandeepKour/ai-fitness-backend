import db from "../config/db.js";

export const userTable = "users";

export const userColumns = {
  id: "INT AUTO_INCREMENT PRIMARY KEY",
  name: "VARCHAR(100)",
  email: "VARCHAR(150) UNIQUE",
  password: "VARCHAR(255)",
  age: "INT",
  gender: "VARCHAR(10)",
  height: "FLOAT",
  weight: "FLOAT",
  goal: "VARCHAR(50)",
  diet_type: "VARCHAR(50)",
  activity_level: "VARCHAR(50)",
  created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
};

export const syncUserTable = async () => {
  const conn = await db(); // ✅

  const cols = Object.entries(userColumns)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");

  await conn.query(`CREATE TABLE IF NOT EXISTS ${userTable} (${cols})`);

  const [existing] = await conn.query(`SHOW COLUMNS FROM ${userTable}`);
  const existingCols = existing.map((c) => c.Field);

  for (const col in userColumns) {
    if (!existingCols.includes(col)) {
      await conn.query(
        `ALTER TABLE ${userTable} ADD COLUMN ${col} ${userColumns[col]}`
      );
    }
  }
};