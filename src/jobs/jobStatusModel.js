import db from "../config/db.js";

export const jobStatusTable = "job_status";

/**
 * Durable job lifecycle history, complementing BullMQ's own Redis-backed
 * state (which rotates away per removeOnComplete/removeOnFail — see
 * constants.js). This table survives Redis restarts/rotation and gives
 * admins a permanent audit trail of what background jobs ran.
 */
export const jobStatusColumns = {
  id: "INT AUTO_INCREMENT PRIMARY KEY",
  job_id: "VARCHAR(191) NOT NULL UNIQUE",
  job_name: "VARCHAR(100) NOT NULL",
  queue_name: "VARCHAR(100) NOT NULL",
  status: "VARCHAR(20) NOT NULL",
  attempts_made: "INT NOT NULL DEFAULT 0",
  attempts_max: "INT NULL",
  error_message: "TEXT NULL",
  result_summary: "JSON NULL",
  created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
  updated_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
};

export async function syncJobStatusTable() {
  const conn = await db();

  const cols = Object.entries(jobStatusColumns)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");

  await conn.query(`CREATE TABLE IF NOT EXISTS ${jobStatusTable} (${cols})`);

  const [existing] = await conn.query(`SHOW COLUMNS FROM ${jobStatusTable}`);
  const existingCols = existing.map((c) => c.Field);

  for (const col in jobStatusColumns) {
    if (!existingCols.includes(col)) {
      await conn.query(
        `ALTER TABLE ${jobStatusTable} ADD COLUMN ${col} ${jobStatusColumns[col]}`,
      );
    }
  }
}

export async function upsertJobStatus(entry) {
  const conn = await db();
  await conn.query(
    `INSERT INTO ${jobStatusTable}
      (job_id, job_name, queue_name, status, attempts_made, attempts_max, error_message, result_summary)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)
     ON DUPLICATE KEY UPDATE
       status = VALUES(status),
       attempts_made = VALUES(attempts_made),
       attempts_max = VALUES(attempts_max),
       error_message = VALUES(error_message),
       result_summary = VALUES(result_summary),
       updated_at = CURRENT_TIMESTAMP`,
    [
      entry.jobId,
      entry.jobName,
      entry.queueName,
      entry.status,
      entry.attemptsMade ?? 0,
      entry.attemptsMax ?? null,
      entry.errorMessage ?? null,
      entry.resultSummary ? JSON.stringify(entry.resultSummary) : null,
    ],
  );
}

export async function getJobStatusByJobId(jobId) {
  const conn = await db();
  const [rows] = await conn.query(
    `SELECT * FROM ${jobStatusTable} WHERE job_id = ? LIMIT 1`,
    [jobId],
  );
  return rows[0] || null;
}

export async function listJobStatuses({ status, jobName, limit = 50, offset = 0 } = {}) {
  const conn = await db();
  const clauses = [];
  const values = [];

  if (status) {
    clauses.push("status = ?");
    values.push(status);
  }
  if (jobName) {
    clauses.push("job_name = ?");
    values.push(jobName);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  values.push(Number(limit) || 50, Number(offset) || 0);

  const [rows] = await conn.query(
    `SELECT * FROM ${jobStatusTable} ${where} ORDER BY id DESC LIMIT ? OFFSET ?`,
    values,
  );
  return rows;
}
