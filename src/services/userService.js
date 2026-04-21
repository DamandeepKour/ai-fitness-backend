import db from "../config/db.js";

// ✅ Create User
export const createUserService = async (data) => {
  const conn = await db();

  const [result] = await conn.query(
    `INSERT INTO users 
    (name, email, password, age, gender, height, weight, goal, diet_type, activity_level)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      data.name,
      data.email,
      data.password,
      data.age,
      data.gender,
      data.height,
      data.weight,
      data.goal,
      data.diet_type,
      data.activity_level,
    ]
  );

  return { id: result.insertId };
};

// ✅ Get All Users
export const getUsersService = async () => {
  const conn = await db();

  const [rows] = await conn.query(`SELECT * FROM users ORDER BY id DESC`);

  return rows;
};

// ✅ Get User by ID
export const getUserByIdService = async (id) => {
  const conn = await db();

  const [rows] = await conn.query(`SELECT * FROM users WHERE id = ?`, [id]);

  return rows[0];
};