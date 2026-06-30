import db from "../config/db.js";

export const signupVerificationTable = "signup_verifications";

export const signupVerificationColumns = {
  id: "INT AUTO_INCREMENT PRIMARY KEY",
  email: "VARCHAR(150) NOT NULL UNIQUE",
  otp_hash: "VARCHAR(255) NOT NULL",
  name: "VARCHAR(100) NOT NULL",
  phone: "VARCHAR(30) NULL",
  password_hash: "VARCHAR(255) NOT NULL",
  expires_at: "TIMESTAMP NOT NULL",
  attempts: "INT DEFAULT 0",
  created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
};

export async function syncSignupVerificationTable() {
  const conn = await db();
  const cols = Object.entries(signupVerificationColumns)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");

  await conn.query(`CREATE TABLE IF NOT EXISTS ${signupVerificationTable} (${cols})`);

  const [existing] = await conn.query(`SHOW COLUMNS FROM ${signupVerificationTable}`);
  const existingCols = existing.map((c) => c.Field);

  for (const col in signupVerificationColumns) {
    if (!existingCols.includes(col)) {
      await conn.query(
        `ALTER TABLE ${signupVerificationTable} ADD COLUMN ${col} ${signupVerificationColumns[col]}`,
      );
    }
  }
}
