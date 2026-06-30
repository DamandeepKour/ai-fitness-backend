import bcrypt from "bcryptjs";
import crypto from "crypto";
import db from "../config/db.js";
import { signupVerificationTable } from "../models/signupVerificationModel.js";
import { validateSignupEmail } from "../utils/emailValidator.js";
import { signupSchema } from "../validators/authValidator.js";
import { sendSignupOtpEmail } from "./emailService.js";
import { isEmailConfigured } from "../config/email.js";

const OTP_EXPIRES_MINUTES = Number(process.env.SIGNUP_OTP_EXPIRES_MINUTES || 10);
const MAX_OTP_ATTEMPTS = 5;

function generateOtp() {
  return String(crypto.randomInt(100000, 999999));
}

export async function sendSignupCodeService(data) {
  const { error, value } = signupSchema.validate(data, { abortEarly: false, stripUnknown: true });
  if (error) {
    throw new Error(error.details[0]?.message || "Invalid signup data");
  }

  if (!isEmailConfigured()) {
    throw new Error("Email verification is not available. Please contact support.");
  }

  const email = await validateSignupEmail(value.email);
  const conn = await db();

  const [existing] = await conn.query(`SELECT id FROM users WHERE email = ? LIMIT 1`, [email]);
  if (existing[0]) {
    throw new Error("An account with this email already exists");
  }

  const otp = generateOtp();
  const otpHash = await bcrypt.hash(otp, 10);
  const passwordHash = await bcrypt.hash(value.password, 10);

  await conn.query(
    `INSERT INTO ${signupVerificationTable}
      (email, otp_hash, name, phone, password_hash, expires_at, attempts)
     VALUES (?, ?, ?, ?, ?, DATE_ADD(NOW(), INTERVAL ? MINUTE), 0)
     ON DUPLICATE KEY UPDATE
      otp_hash = VALUES(otp_hash),
      name = VALUES(name),
      phone = VALUES(phone),
      password_hash = VALUES(password_hash),
      expires_at = VALUES(expires_at),
      attempts = 0`,
    [
      email,
      otpHash,
      value.name,
      value.phone || value.mobile_number || null,
      passwordHash,
      OTP_EXPIRES_MINUTES,
    ],
  );

  const emailResult = await sendSignupOtpEmail({
    to: email,
    name: value.name,
    code: otp,
    expiresInMinutes: OTP_EXPIRES_MINUTES,
  });

  if (!emailResult.sent) {
    await conn.query(`DELETE FROM ${signupVerificationTable} WHERE email = ?`, [email]);
    throw new Error("Could not send verification email. Check that your email address is correct.");
  }

  return {
    email,
    expiresInMinutes: OTP_EXPIRES_MINUTES,
    message: "Verification code sent. Check your inbox.",
  };
}

export async function verifySignupCode(conn, email, code) {
  const [rows] = await conn.query(
    `SELECT * FROM ${signupVerificationTable}
     WHERE email = ? AND expires_at > NOW()
     LIMIT 1`,
    [email],
  );

  const pending = rows[0];
  if (!pending) {
    throw new Error("Verification code expired or not found. Request a new code.");
  }

  if (pending.attempts >= MAX_OTP_ATTEMPTS) {
    throw new Error("Too many failed attempts. Request a new verification code.");
  }

  const isMatch = await bcrypt.compare(String(code || "").trim(), pending.otp_hash);
  if (!isMatch) {
    await conn.query(
      `UPDATE ${signupVerificationTable} SET attempts = attempts + 1 WHERE id = ?`,
      [pending.id],
    );
    throw new Error("Invalid verification code");
  }

  return pending;
}

export async function deletePendingSignup(conn, email) {
  await conn.query(`DELETE FROM ${signupVerificationTable} WHERE email = ?`, [email]);
}
