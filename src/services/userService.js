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

// src/services/userService.js
export const updateUserService = async (userId, data) => {
  const conn = await db();

  // ✅ Get old user data
  const oldUser = await getUserByIdService(userId);

  const allowedFields = [
    "name", "email", "password",
    "age", "gender", "height",
    "weight", "goal", "diet_type", "activity_level"
  ];

  const fields = [];
  const values = [];

  for (const key of Object.keys(data)) {
    if (allowedFields.includes(key)) {
      fields.push(`${key} = ?`);
      values.push(data[key]);

      // 🔥 TRACK CHANGE
      if (oldUser[key] != data[key]) {
        await saveUserHistory({
          user_id: userId,
          field_name: key,
          old_value: oldUser[key],
          new_value: data[key],
        });
      }
    }
  }

  if (fields.length === 0) {
    throw new Error("No valid fields provided");
  }

  fields.push("last_updated_at = NOW()");
  values.push(userId);

  const query = `
    UPDATE users 
    SET ${fields.join(", ")}
    WHERE id = ?
  `;

  await conn.query(query, values);

  return { success: true };
};

//Get All Users
export const getUsersService = async () => {
  const conn = await db();

  const [rows] = await conn.query(`SELECT * FROM users ORDER BY id DESC`);

  return rows;
};

//Get User by ID
export const getUserByIdService = async (id) => {
  const conn = await db();

  const [rows] = await conn.query(`SELECT * FROM users WHERE id = ?`, [id]);

  return rows[0];
};

//get history of user
export const getUserHistoryService = async (userId, filters) => {
  const conn = await db();

  const { page, limit, field, from, to } = filters;

  const offset = (page - 1) * limit;

  let where = "WHERE user_id = ?";
  const values = [userId];

  // ✅ Filter by field (weight, goal, etc.)
  if (field) {
    where += " AND field_name = ?";
    values.push(field);
  }

  // ✅ Date range filter
  if (from && to) {
    where += " AND DATE(changed_at) BETWEEN ? AND ?";
    values.push(from, to);
  }

  // ✅ Total count
  const [countResult] = await conn.query(
    `SELECT COUNT(*) as total FROM user_history ${where}`,
    values
  );

  const total = countResult[0].total;

  // ✅ Fetch paginated data
  const [rows] = await conn.query(
    `SELECT field_name, old_value, new_value, changed_at
     FROM user_history
     ${where}
     ORDER BY changed_at DESC
     LIMIT ? OFFSET ?`,
    [...values, limit, offset]
  );

  return {
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
    data: rows,
  };
};