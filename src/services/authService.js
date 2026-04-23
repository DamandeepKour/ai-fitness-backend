import db from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

// 🔐 SIGNUP
export const signupService = async (data) => {
  const conn = await db();

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const [result] = await conn.query(
    `INSERT INTO users (name, email, password)
     VALUES (?, ?, ?)`,
    [data.name, data.email, hashedPassword]
  );

  return { id: result.insertId };
};

// 🔐 LOGIN
export const loginService = async (data) => {
  const conn = await db();

  const [rows] = await conn.query(
    `SELECT * FROM users WHERE email = ?`,
    [data.email]
  );

  const user = rows[0];
  if (!user) throw new Error("User not found");

  const isMatch = await bcrypt.compare(data.password, user.password);
  if (!isMatch) throw new Error("Invalid credentials");

  const token = jwt.sign(
    { id: user.id, email: user.email },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  return { token, user };
};