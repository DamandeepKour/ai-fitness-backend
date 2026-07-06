import { OAuth2Client } from "google-auth-library";
import db from "../config/db.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import crypto from "crypto";

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

function getGoogleClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("Google sign-in is not configured on the server");
  }
  return new OAuth2Client(clientId);
}

async function createGoogleUser({ email, name, googleId, picture }) {
  const conn = await db();
  const randomPassword = crypto.randomBytes(32).toString("hex");
  const hashedPassword = await bcrypt.hash(randomPassword, 10);

  const [result] = await conn.query(
    `INSERT INTO users (name, email, password, user_type, auth_provider, google_id, profile_picture, is_verified, verified_at)
     VALUES (?, ?, ?, 'user', 'google', ?, ?, TRUE, NOW())`,
    [name || email.split("@")[0], email, hashedPassword, googleId, picture || null],
  );

  const [rows] = await conn.query(`SELECT * FROM users WHERE id = ? LIMIT 1`, [result.insertId]);
  return rows[0];
}

export async function googleAuthService(credential) {
  const client = getGoogleClient();
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: process.env.GOOGLE_CLIENT_ID,
  });

  const payload = ticket.getPayload();
  if (!payload?.email || payload.email_verified !== true) {
    throw new Error("Google account email is not verified");
  }

  const email = String(payload.email).trim().toLowerCase();
  const googleId = payload.sub;
  const name = payload.name || email.split("@")[0];
  const picture = payload.picture || null;

  const conn = await db();
  const [rows] = await conn.query(
    `SELECT * FROM users WHERE google_id = ? OR email = ? LIMIT 1`,
    [googleId, email],
  );

  let user = rows[0];

  if (user) {
    if (!user.google_id) {
      await conn.query(
        `UPDATE users SET google_id = ?, auth_provider = 'google', profile_picture = COALESCE(?, profile_picture), is_verified = TRUE, verified_at = COALESCE(verified_at, NOW()) WHERE id = ?`,
        [googleId, picture, user.id],
      );
      const [updated] = await conn.query(`SELECT * FROM users WHERE id = ? LIMIT 1`, [user.id]);
      user = updated[0];
    }
  } else {
    user = await createGoogleUser({ email, name, googleId, picture });
  }

  if (user.user_type && user.user_type !== "user") {
    throw new Error("Google sign-in is only available for user accounts");
  }

  const token = signToken(user);
  return { token, user: sanitizeUser(user), isNewUser: !rows[0] };
}
