import db from "../config/db.js";

export const trafficLogTable = "api_request_logs";

export const trafficLogColumns = {
  id: "INT AUTO_INCREMENT PRIMARY KEY",
  user_id: "INT NULL",
  method: "VARCHAR(10) NOT NULL",
  path: "VARCHAR(500) NOT NULL",
  status_code: "INT NOT NULL",
  duration_ms: "INT NOT NULL DEFAULT 0",
  ip: "VARCHAR(45) NULL",
  user_agent: "VARCHAR(500) NULL",
  created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
};

export const syncTrafficLogTable = async () => {
  const conn = await db();

  const cols = Object.entries(trafficLogColumns)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");

  await conn.query(`CREATE TABLE IF NOT EXISTS ${trafficLogTable} (${cols})`);

  const [existing] = await conn.query(`SHOW COLUMNS FROM ${trafficLogTable}`);
  const existingCols = existing.map((c) => c.Field);

  for (const col in trafficLogColumns) {
    if (!existingCols.includes(col)) {
      await conn.query(
        `ALTER TABLE ${trafficLogTable} ADD COLUMN ${col} ${trafficLogColumns[col]}`,
      );
    }
  }

  await conn.query(
    `CREATE INDEX IF NOT EXISTS idx_traffic_created_at ON ${trafficLogTable} (created_at)`,
  ).catch(() => {});

  await conn.query(
    `CREATE INDEX IF NOT EXISTS idx_traffic_user_id ON ${trafficLogTable} (user_id)`,
  ).catch(() => {});
};

export async function insertTrafficLog({
  userId = null,
  method,
  path,
  statusCode,
  durationMs,
  ip = null,
  userAgent = null,
}) {
  const conn = await db();
  await conn.query(
    `INSERT INTO ${trafficLogTable}
      (user_id, method, path, status_code, duration_ms, ip, user_agent)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [userId, method, path, statusCode, durationMs, ip, userAgent?.slice(0, 500) ?? null],
  );
}
