import db from "../config/db.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { createSignupLoginLink, verifyLoginTokenService } from "./loginTokenService.js";
import { loginTokenTable } from "../models/loginTokenModel.js";
import { getFrontendUrl } from "../config/email.js";
import { sendPasswordResetEmail } from "./emailService.js";
import { validateSignupEmail, normalizeEmail } from "../utils/emailValidator.js";
import { signupSchema } from "../validators/authValidator.js";

const ALLOWED_USER_TYPES = new Set(["user", "staff", "superadmin"]);
const PASSWORD_RESET_TOKEN_BYTES = 32;
const PASSWORD_RESET_EXPIRES_MINUTES = Number(process.env.PASSWORD_RESET_EXPIRES_MINUTES || 30);

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

function validateNewPassword(password, confirmPassword) {
  if (!password) throw new Error("Password is required");
  if (password.length < 8) throw new Error("Password must be at least 8 characters");
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw new Error("Password must include letters and numbers");
  }
  if (confirmPassword != null && password !== confirmPassword) {
    throw new Error("Passwords do not match");
  }
}

function createPasswordResetToken() {
  return crypto.randomBytes(PASSWORD_RESET_TOKEN_BYTES).toString("hex");
}

export const verifyEmailService = async (data) => {
  const email = await validateSignupEmail(data.email);
  return {
    valid: true,
    email,
    message: "Email is valid",
  };
};

// 🔐 SIGNUP
export const signupService = async (data, options = {}) => {
  const { error, value } = signupSchema.validate(data, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new Error(error.details[0]?.message || "Invalid signup data");
  }

  const conn = await db();
  const userType = normalizeUserType(options.userType || data.user_type);
  const email = await validateSignupEmail(value.email);

  const hashedPassword = await bcrypt.hash(value.password, 10);

  let result;
  try {
    [result] = await conn.query(
      `INSERT INTO users (name, email, password, user_type, mobile_number)
       VALUES (?, ?, ?, ?, ?)`,
      [value.name, email, hashedPassword, userType, value.phone || value.mobile_number || null],
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
      name: value.name,
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

export const forgotPasswordService = async (data) => {
  const email = String(data.email || "").trim().toLowerCase();
  if (!email) throw new Error("Email is required");

  const conn = await db();
  const [rows] = await conn.query(
    `SELECT id, email, name FROM users WHERE email = ? LIMIT 1`,
    [email],
  );

  const user = rows[0];
  if (!user) throw new Error("No account found with this email");

  const token = createPasswordResetToken();
  await conn.query(
    `INSERT INTO ${loginTokenTable} (user_id, token, purpose, expires_at)
     VALUES (?, ?, 'password_reset', DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
    [user.id, token, PASSWORD_RESET_EXPIRES_MINUTES],
  );

  const resetUrl = `${getFrontendUrl()}/forgot-password?token=${token}`;
  const emailResult = await sendPasswordResetEmail({
    to: user.email,
    name: user.name,
    resetUrl,
  });

  return {
    resetToken: token,
    emailSent: emailResult.sent === true,
    expiresInMinutes: PASSWORD_RESET_EXPIRES_MINUTES,
    message: "Email verified. Enter a new password.",
  };
};

export const resetPasswordService = async (data) => {
  const token = String(data.token || "").trim();
  const password = String(data.password || "");
  const confirmPassword = data.confirmPassword != null ? String(data.confirmPassword) : undefined;

  if (!token || token.length < 32) throw new Error("Invalid or expired reset link");
  validateNewPassword(password, confirmPassword);

  const conn = await db();
  const [rows] = await conn.query(
    `SELECT lt.id, lt.user_id
     FROM ${loginTokenTable} lt
     WHERE lt.token = ?
       AND lt.purpose = 'password_reset'
       AND lt.used_at IS NULL
       AND lt.expires_at > NOW()
     LIMIT 1`,
    [token],
  );

  const resetToken = rows[0];
  if (!resetToken) throw new Error("Invalid or expired reset link");

  const hashedPassword = await bcrypt.hash(password, 10);
  await conn.query(`UPDATE users SET password = ? WHERE id = ?`, [
    hashedPassword,
    resetToken.user_id,
  ]);
  await conn.query(
    `UPDATE ${loginTokenTable}
     SET used_at = NOW()
     WHERE user_id = ? AND purpose = 'password_reset' AND used_at IS NULL`,
    [resetToken.user_id],
  );

  return { message: "Password reset successfully" };
};
