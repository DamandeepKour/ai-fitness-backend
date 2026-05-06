import db from "../config/db.js";

export const saveWeight = async (data) => {
  const conn = await db();

  const query = `
    INSERT INTO weight_logs (user_id, weight, log_date)
    VALUES (?, ?, ?)
    ON DUPLICATE KEY UPDATE
      weight = VALUES(weight)
  `;

  const [result] = await conn.query(query, [
    data.user_id,
    data.weight,
    data.log_date,
  ]);

  return {
    updated: result.affectedRows === 2,
  };
};

//get weekly weight
export const getWeeklyWeight = async (userId) => {
  const conn = await db();

  const [rows] = await conn.query(`
    SELECT log_date, weight
    FROM weight_logs
    WHERE user_id = ?
    ORDER BY log_date ASC
    LIMIT 7
  `, [userId]);

  return rows;
};

//get latest weight
export const getLatestWeight = async (userId) => {
  const conn = await db();

  const [rows] = await conn.query(
    `SELECT weight, log_date
     FROM weight_logs
     WHERE user_id = ?
     ORDER BY log_date DESC
     LIMIT 1`,
    [userId]
  );

  return rows[0] || null;
};