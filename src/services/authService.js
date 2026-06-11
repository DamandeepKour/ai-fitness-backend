import db from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { createSignupLoginLink, verifyLoginTokenService } from "./loginTokenService.js";

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

function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, user_type: user.user_type || "user" },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN },
  );
}

// 🔐 SIGNUP
export const signupService = async (data, options = {}) => {
  const conn = await db();
  const userType = normalizeUserType(options.userType || data.user_type);
  const email = String(data.email || "").trim().toLowerCase();

  const hashedPassword = await bcrypt.hash(data.password, 10);

  let result;
  try {
    [result] = await conn.query(
      `INSERT INTO users (name, email, password, user_type, mobile_number)
       VALUES (?, ?, ?, ?, ?)`,
      [data.name, email, hashedPassword, userType, data.phone || data.mobile_number || null],
    );
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      throw new Error("An account with this email already exists");
    }
    throw err;
  }

  const userId = result.insertId;
  let loginLink = null;

  if (userType === "user") {
    loginLink = await createSignupLoginLink(userId, {
      email,
      name: data.name,
    });
  }

  return {
    id: userId,
    user_type: userType,
    emailSent: loginLink?.emailSent ?? false,
    message: loginLink?.emailSent
      ? "Account created. Check your email for a login link."
      : loginLink
        ? "Account created. Email could not be sent — check SMTP settings or use password login."
        : "User registered successfully",
  };
};

// 🔐 LOGIN
export const loginService = async (data, options = {}) => {
  const conn = await db();
  const requiredUserType = options.requiredUserType
    ? normalizeUserType(options.requiredUserType)
    : null;

  const [rows] = await conn.query(
    `SELECT * FROM users WHERE email = ?`,
    [String(data.email || "").trim().toLowerCase()],
  );

  const user = rows[0];
  if (!user) throw new Error("User not found");

  const isMatch = await bcrypt.compare(data.password, user.password);
  if (!isMatch) throw new Error("Invalid credentials");
  if (requiredUserType && user.user_type !== requiredUserType) {
    throw new Error(`This login is only allowed for ${requiredUserType} accounts`);
  }

  const token = signToken(user);

  return { token, user: sanitizeUser(user) };
};

export const magicLoginService = async (token) => {
  const { user } = await verifyLoginTokenService(token);
  const jwtToken = signToken(user);
  return { token: jwtToken, user: sanitizeUser(user) };
};
