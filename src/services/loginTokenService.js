import crypto from "crypto";
import db from "../config/db.js";
import { loginTokenTable } from "../models/loginTokenModel.js";
import { getFrontendUrl } from "../config/email.js";
import { sendSignupLoginEmail } from "./emailService.js";

const TOKEN_BYTES = 32;
const DEFAULT_EXPIRY_HOURS = Number(process.env.MAGIC_LINK_EXPIRES_HOURS || 24);

function generateToken() {
  return crypto.randomBytes(TOKEN_BYTES).toString("hex");
}

export async function createSignupLoginLink(userId, { email, name }) {
  const conn = await db();
  const token = generateToken();
  const expiryHours = DEFAULT_EXPIRY_HOURS;

  await conn.query(
    `INSERT INTO ${loginTokenTable} (user_id, token, purpose, expires_at)
     VALUES (?, ?, 'signup_login', DATE_ADD(NOW(), INTERVAL ? HOUR))`,
    [userId, token, expiryHours],
  );

  const loginUrl = `${getFrontendUrl()}/auth/magic-login?token=${token}`;
  const emailResult = await sendSignupLoginEmail({ to: email, name, loginUrl });

  return {
    loginUrl,
    emailSent: emailResult.sent === true,
    emailReason: emailResult.reason || null,
    expiresInHours: expiryHours,
  };
}

export async function verifyLoginTokenService(token) {
  if (!token || typeof token !== "string" || token.length < 32) {
    throw new Error("Invalid or expired login link");
  }

  const conn = await db();

  const [rows] = await conn.query(
    `SELECT lt.*, u.id AS uid, u.email, u.name, u.user_type, u.mobile_number,
            u.country_code, u.age, u.gender, u.height, u.weight, u.goal,
            u.diet_type, u.activity_level, u.created_at, u.last_updated_at
     FROM ${loginTokenTable} lt
     INNER JOIN users u ON u.id = lt.user_id
     WHERE lt.token = ?
       AND lt.used_at IS NULL
       AND lt.expires_at > NOW()
     LIMIT 1`,
    [token.trim()],
  );

  const row = rows[0];
  if (!row) {
    throw new Error("Invalid or expired login link");
  }

  await conn.query(
    `UPDATE ${loginTokenTable} SET used_at = NOW() WHERE id = ?`,
    [row.id],
  );

  return {
    user: {
      id: row.uid,
      email: row.email,
      name: row.name,
      user_type: row.user_type,
      mobile_number: row.mobile_number,
      country_code: row.country_code,
      age: row.age,
      gender: row.gender,
      height: row.height,
      weight: row.weight,
      goal: row.goal,
      diet_type: row.diet_type,
      activity_level: row.activity_level,
      created_at: row.created_at,
      last_updated_at: row.last_updated_at,
    },
  };
}
