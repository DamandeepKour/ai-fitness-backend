import db from "../config/db.js";

export const userTable = "users";

export const userColumns = {
  id: "INT AUTO_INCREMENT PRIMARY KEY",
  name: "VARCHAR(100)",
  email: "VARCHAR(150) UNIQUE",
  password: "VARCHAR(255)",
  user_type: "VARCHAR(20) DEFAULT 'user'",
  mobile_number: "VARCHAR(30)",
  country_code: "VARCHAR(10)",
  language: "VARCHAR(50)",
  age: "INT",
  gender: "VARCHAR(10)",
  height: "FLOAT",
  weight: "FLOAT",
  goal: "VARCHAR(50)",
  diet_type: "VARCHAR(50)",
  activity_level: "VARCHAR(50)",
  auth_provider: "VARCHAR(20) DEFAULT 'local'",
  google_id: "VARCHAR(255) NULL",
  profile_picture: "VARCHAR(500) NULL",
  is_verified: "BOOLEAN DEFAULT FALSE",
  verification_token: "VARCHAR(255) NULL",
  verification_token_expiry: "DATETIME NULL",
  verified_at: "DATETIME NULL",
  created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
  last_updated_at: "TIMESTAMP NULL DEFAULT NULL"
};

export const syncUserTable = async () => {
  const conn = await db(); // ✅

  const cols = Object.entries(userColumns)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");

  await conn.query(`CREATE TABLE IF NOT EXISTS ${userTable} (${cols})`);

  const [existing] = await conn.query(`SHOW COLUMNS FROM ${userTable}`);
  const existingCols = existing.map((c) => c.Field);

  const hadVerifiedColumn = existingCols.includes("is_verified");

  for (const col in userColumns) {
    if (!existingCols.includes(col)) {
      await conn.query(
        `ALTER TABLE ${userTable} ADD COLUMN ${col} ${userColumns[col]}`
      );
    }
  }

  if (!hadVerifiedColumn) {
    await conn.query(
      `UPDATE ${userTable}
       SET is_verified = TRUE, verified_at = COALESCE(verified_at, NOW())
       WHERE is_verified = FALSE OR is_verified IS NULL`
    );
  }

  await conn.query(
    `UPDATE ${userTable}
     SET is_verified = TRUE, verified_at = COALESCE(verified_at, NOW())
     WHERE auth_provider = 'google'
       AND (is_verified = FALSE OR is_verified IS NULL)`
  );
};