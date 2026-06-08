import db from "../config/db.js";
import { contactTable } from "../models/contactModel.js";

const VALID_STATUSES = ["open", "in_progress", "resolved"];

export async function getSupportTicketsService({ status, limit = 50 } = {}) {
  const conn = await db();
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 200);

  let query = `SELECT id, name, email, message, status, created_at, updated_at
               FROM ${contactTable}`;
  const params = [];

  if (status && VALID_STATUSES.includes(status)) {
    query += ` WHERE status = ?`;
    params.push(status);
  }

  query += ` ORDER BY
    CASE status WHEN 'open' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
    created_at DESC
    LIMIT ?`;
  params.push(safeLimit);

  const [rows] = await conn.query(query, params);

  const [[counts]] = await conn.query(
    `SELECT
      COUNT(*) AS total,
      SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS openCount,
      SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS inProgressCount,
      SUM(CASE WHEN status = 'resolved' THEN 1 ELSE 0 END) AS resolvedCount
     FROM ${contactTable}`,
  );

  return {
    tickets: rows.map((row) => ({
      id: row.id,
      name: row.name,
      email: row.email,
      message: row.message,
      status: row.status || "open",
      createdAt: row.created_at,
      updatedAt: row.updated_at || row.created_at,
    })),
    counts: {
      total: Number(counts.total || 0),
      open: Number(counts.openCount || 0),
      inProgress: Number(counts.inProgressCount || 0),
      resolved: Number(counts.resolvedCount || 0),
    },
  };
}

export async function updateSupportTicketStatusService(ticketId, status) {
  if (!VALID_STATUSES.includes(status)) {
    throw new Error("Invalid ticket status");
  }

  const conn = await db();
  const [result] = await conn.query(
    `UPDATE ${contactTable} SET status = ?, updated_at = NOW() WHERE id = ?`,
    [status, ticketId],
  );

  if (!result.affectedRows) {
    return null;
  }

  const [rows] = await conn.query(
    `SELECT id, name, email, message, status, created_at, updated_at
     FROM ${contactTable} WHERE id = ?`,
    [ticketId],
  );

  return rows[0]
    ? {
        id: rows[0].id,
        name: rows[0].name,
        email: rows[0].email,
        message: rows[0].message,
        status: rows[0].status,
        createdAt: rows[0].created_at,
        updatedAt: rows[0].updated_at,
      }
    : null;
}
