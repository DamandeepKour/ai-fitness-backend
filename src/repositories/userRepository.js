import db from "../config/db.js";
import { userTable } from "../models/userModel.js";

export const findUserByEmail = async (email) => {
  const conn = await db();
  const [rows] = await conn.query(
    `SELECT * FROM ${userTable} WHERE email = ? LIMIT 1`,
    [email],
  );
  return rows[0] || null;
};

export const findUserByVerificationTokenHash = async (tokenHash) => {
  const conn = await db();
  const [rows] = await conn.query(
    `SELECT * FROM ${userTable}
     WHERE verification_token = ?
       AND verification_token_expiry > NOW()
     LIMIT 1`,
    [tokenHash],
  );
  return rows[0] || null;
};

export const findUserByVerificationTokenHashAny = async (tokenHash) => {
  const conn = await db();
  const [rows] = await conn.query(
    `SELECT * FROM ${userTable} WHERE verification_token = ? LIMIT 1`,
    [tokenHash],
  );
  return rows[0] || null;
};

export const createUser = async ({
  name,
  email,
  password,
  userType,
  mobileNumber,
  isVerified = false,
}) => {
  const conn = await db();
  const [result] = await conn.query(
    `INSERT INTO ${userTable}
       (name, email, password, user_type, mobile_number, is_verified)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [name, email, password, userType, mobileNumber, isVerified],
  );
  return result.insertId;
};

export const updateVerificationToken = async (userId, tokenHash, expiresAt) => {
  const conn = await db();
  await conn.query(
    `UPDATE ${userTable}
     SET verification_token = ?,
         verification_token_expiry = ?,
         is_verified = FALSE,
         verified_at = NULL
     WHERE id = ?`,
    [tokenHash, expiresAt, userId],
  );
};

export const markUserVerified = async (userId) => {
  const conn = await db();
  await conn.query(
    `UPDATE ${userTable}
     SET is_verified = TRUE,
         verified_at = NOW(),
         verification_token = NULL,
         verification_token_expiry = NULL
     WHERE id = ?`,
    [userId],
  );
};

export const findUserById = async (userId) => {
  const conn = await db();
  const [rows] = await conn.query(
    `SELECT * FROM ${userTable} WHERE id = ? LIMIT 1`,
    [userId],
  );
  return rows[0] || null;
};

export const deleteUnverifiedUsersOlderThanHours = async (hours = 24) => {
  const conn = await db();
  const [result] = await conn.query(
    `DELETE FROM ${userTable}
     WHERE is_verified = FALSE
       AND created_at < DATE_SUB(NOW(), INTERVAL ? HOUR)`,
    [hours],
  );
  return result.affectedRows;
};
