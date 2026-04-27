// import  db from "../config/db.js";

// export const savePlan = async (userId, data) => {
//     const conn = await db(); 
//      await db.query(
//     `INSERT INTO plans (user_id, goal, calories, diet_plan, workout_plan)
//      VALUES (?, ?, ?, ?, ?)`,
//     [
//       userId,
//       data.goal || "",
//       data.calories,
//       JSON.stringify(data.diet_plan),
//       JSON.stringify(data.workout_plan),
//     ]
//   );
// };

// export const getLatestPlan = async (userId) => {
//   const [rows] = await db.query(
//     `SELECT * FROM plans WHERE user_id = ? ORDER BY id DESC LIMIT 1`,
//     [userId]
//   );

//   return rows[0];
// };

import db from "../config/db.js";

// ✅ SAVE PLAN
export const savePlan = async (userId, data) => {
  const conn = await db();

  await conn.query(
    `INSERT INTO plans (user_id, goal, calories, diet_plan, workout_plan)
     VALUES (?, ?, ?, ?, ?)`,
    [
      userId,
      data.goal,
      data.calories,
      JSON.stringify(data.diet_plan),
      JSON.stringify(data.workout_plan),
    ]
  );
};

// ✅ GET LATEST PLAN (🔥 IMPORTANT)
export const getUserPlan = async (userId) => {
  const conn = await db();

  const [rows] = await conn.query(
    `SELECT * FROM plans 
     WHERE user_id = ? 
     ORDER BY created_at DESC 
     LIMIT 1`,
    [userId]
  );

  return rows[0] || null;
};