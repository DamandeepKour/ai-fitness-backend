import db from "../config/db.js";

export const saveDailyLog = async (data) => {
  const conn = await db();

  const query = `
    INSERT INTO daily_logs 
    (user_id, meal_type, food_name, calories, protein, carbs, fat, log_date)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      food_name = VALUES(food_name),
      calories = VALUES(calories),
      protein = VALUES(protein),
      carbs = VALUES(carbs),
      fat = VALUES(fat)
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
    updated: result.affectedRows === 2, // ✅ updated case
  };
};

export const getDailyLogs = async (userId) => {
  const conn = await db(); // ✅ FIX

  const today = new Date().toISOString().split("T")[0];

  const [rows] = await conn.query( // ✅ FIX
    `SELECT * FROM daily_logs WHERE user_id = ? AND log_date = ?`,
    [userId, today]
  );

  return rows;
};

