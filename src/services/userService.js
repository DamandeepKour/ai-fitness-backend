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

  if (field) {
    where += " AND field_name = ?";
    values.push(field);
  }

  if (from && to) {
    where += " AND DATE(changed_at) BETWEEN ? AND ?";
    values.push(from, to);
  }

  // ✅ TOTAL COUNT
  const [countResult] = await conn.query(
    `SELECT COUNT(*) as total FROM user_history ${where}`,
    values
  );

  const total = countResult[0].total;

  // ✅ FETCH SORTED DATA (IMPORTANT FOR TREND)
  const [rows] = await conn.query(
    `SELECT field_name, old_value, new_value, changed_at
     FROM user_history
     ${where}
     ORDER BY changed_at ASC`,
    values
  );

  // 🔥 1. GRAPH DATA
  const graphData = rows
    .filter((item) => !isNaN(item.new_value))
    .map((item) => ({
      date: item.changed_at,
      value: Number(item.new_value),
    }));

  // 🔥 2. GROUP BY DAY
  const groupedByDay = {};
  rows.forEach((item) => {
    const date = item.changed_at.split("T")[0];

    if (!groupedByDay[date]) {
      groupedByDay[date] = [];
    }

    groupedByDay[date].push(item);
  });

  // 🔥 3. TREND (WEIGHT UP/DOWN)
  let trend = "stable";

  if (graphData.length >= 2) {
    const first = graphData[0].value;
    const last = graphData[graphData.length - 1].value;

    if (last < first) trend = "decreasing 📉";
    else if (last > first) trend = "increasing 📈";
  }

  // 🔥 4. AVERAGE CHANGE
  let avgChange = 0;

  if (graphData.length >= 2) {
    let totalChange = 0;

    for (let i = 1; i < graphData.length; i++) {
      totalChange += graphData[i].value - graphData[i - 1].value;
    }

    avgChange = (totalChange / (graphData.length - 1)).toFixed(2);
  }

  // ✅ PAGINATION
  const paginated = rows.slice(offset, offset + limit);

  return {
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),

    data: paginated,

    // 🔥 ANALYTICS
    graph: graphData,
    grouped_by_day: groupedByDay,
    trend,
    average_change: Number(avgChange),
  };
};