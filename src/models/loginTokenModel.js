import db from "../config/db.js";

export const loginTokenTable = "login_tokens";

export const loginTokenColumns = {
  id: "INT AUTO_INCREMENT PRIMARY KEY",
  user_id: "INT NOT NULL",
  token: "VARCHAR(64) NOT NULL UNIQUE",
  purpose: "VARCHAR(30) DEFAULT 'signup_login'",
  expires_at: "TIMESTAMP NOT NULL",
  used_at: "TIMESTAMP NULL DEFAULT NULL",
  created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
};

export async function syncLoginTokenTable() {
  const conn = await db();
  const cols = Object.entries(loginTokenColumns)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");

  await conn.query(`CREATE TABLE IF NOT EXISTS ${loginTokenTable} (${cols})`);

  const [existing] = await conn.query(`SHOW COLUMNS FROM ${loginTokenTable}`);
  const existingCols = existing.map((c) => c.Field);

  for (const col in loginTokenColumns) {
    if (!existingCols.includes(col)) {
      await conn.query(
        `ALTER TABLE ${loginTokenTable} ADD COLUMN ${col} ${loginTokenColumns[col]}`,
      );
    }
  }
}
