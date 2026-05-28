import db from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const ALLOWED_USER_TYPES = new Set(["user", "staff", "superadmin"]);

function normalizeUserType(value) {
  const next = String(value || "user").toLowerCase().trim();
  return ALLOWED_USER_TYPES.has(next) ? next : "user";
}

function sanitizeUser(user) {
  if (!user) return null;
  const { password, ...safeUser } = user;
  return safeUser;
}

// 🔐 SIGNUP
export const signupService = async (data, options = {}) => {
  const conn = await db();
  const userType = normalizeUserType(options.userType || data.user_type);

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const [result] = await conn.query(
    `INSERT INTO users (name, email, password, user_type, mobile_number)
     VALUES (?, ?, ?, ?, ?)`,
    [data.name, data.email, hashedPassword, userType, data.phone || data.mobile_number || null]
  );

  return { id: result.insertId, user_type: userType };
};

// 🔐 LOGIN
export const loginService = async (data, options = {}) => {
  const conn = await db();
  const requiredUserType = options.requiredUserType
    ? normalizeUserType(options.requiredUserType)
    : null;

  const [rows] = await conn.query(
    `SELECT * FROM users WHERE email = ?`,
    [data.email]
  );

  const user = rows[0];
  if (!user) throw new Error("User not found");

  const isMatch = await bcrypt.compare(data.password, user.password);
  if (!isMatch) throw new Error("Invalid credentials");
  if (requiredUserType && user.user_type !== requiredUserType) {
    throw new Error(`This login is only allowed for ${requiredUserType} accounts`);
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, user_type: user.user_type || "user" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN }
  );

  return { token, user: sanitizeUser(user) };
};