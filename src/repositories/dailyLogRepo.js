import db from "../config/db.js";

export const saveDailyLog = async (data) => {
  const conn = await db();

  const query = `
    INSERT INTO daily_logs 
    (user_id, meal_type, food_name, calories, protein, carbs, fat, log_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    data.user_id,
    data.meal_type,
    data.food_name,
    data.calories,
    data.protein,
    data.carbs,
    data.fat,
    data.log_date,
  ];

  const [result] = await conn.query(query, values);

  return {
    id: result.insertId || null,
    inserted: result.affectedRows === 1,
  };
};

export const getDailyLogs = async (userId, logDate) => {
  const conn = await db();

  const [rows] = await conn.query(
    `SELECT * FROM daily_logs WHERE user_id = ? AND log_date = ? ORDER BY created_at ASC`,
    [userId, logDate]
  );

  return rows;
};

/** Logs for [endDate - (days-1), endDate] inclusive (by calendar date). */
export const getDailyLogsForLastDays = async (userId, endDate, days = 7) => {
  const conn = await db();
  const span = Math.max(days - 1, 0);

  const [rows] = await conn.query(
    `SELECT *
     FROM daily_logs
     WHERE user_id = ?
       AND log_date >= DATE_SUB(?, INTERVAL ? DAY)
       AND log_date <= ?
     ORDER BY log_date ASC, created_at ASC`,
    [userId, endDate, span, endDate]
  );

  return rows;
};
