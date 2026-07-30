import db from "../../config/db.js";

export const aiRequestLogTable = "ai_request_logs";

export const aiRequestLogColumns = {
  id: "INT AUTO_INCREMENT PRIMARY KEY",
  user_id: "INT NULL",
  feature: "VARCHAR(50) NOT NULL",
  prompt_version: "VARCHAR(50) NOT NULL",
  model: "VARCHAR(100) NULL",
  status: "VARCHAR(20) NOT NULL",
  latency_ms: "INT NOT NULL DEFAULT 0",
  attempts: "INT NOT NULL DEFAULT 1",
  used_fallback: "BOOLEAN DEFAULT FALSE",
  error_message: "TEXT NULL",
  prompt_tokens: "INT NULL",
  completion_tokens: "INT NULL",
  metadata: "JSON NULL",
  created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
};

export async function syncAiRequestLogTable() {
  const conn = await db();

  const cols = Object.entries(aiRequestLogColumns)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");

  await conn.query(`CREATE TABLE IF NOT EXISTS ${aiRequestLogTable} (${cols})`);

  const [existing] = await conn.query(`SHOW COLUMNS FROM ${aiRequestLogTable}`);
  const existingCols = existing.map((c) => c.Field);

  for (const col in aiRequestLogColumns) {
    if (!existingCols.includes(col)) {
      await conn.query(
        `ALTER TABLE ${aiRequestLogTable} ADD COLUMN ${col} ${aiRequestLogColumns[col]}`,
      );
    }
  }
}

export async function insertAiRequestLog(entry) {
  const conn = await db();
  await conn.query(
    `INSERT INTO ${aiRequestLogTable}
      (user_id, feature, prompt_version, model, status, latency_ms, attempts, used_fallback, error_message, prompt_tokens, completion_tokens, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      entry.userId ?? null,
      entry.feature,
      entry.promptVersion,
      entry.model ?? null,
      entry.status,
      entry.latencyMs ?? 0,
      entry.attempts ?? 1,
      entry.usedFallback ? 1 : 0,
      entry.errorMessage ?? null,
      entry.promptTokens ?? null,
      entry.completionTokens ?? null,
      entry.metadata ? JSON.stringify(entry.metadata) : null,
    ],
  );
}
