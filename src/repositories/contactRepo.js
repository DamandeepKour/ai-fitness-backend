import db from "../config/db.js";
import { contactTable } from "../models/contactModel.js";

export const insertContactMessage = async ({ name, email, message }) => {
  const conn = await db();

  const [result] = await conn.query(
    `INSERT INTO ${contactTable} (name, email, message) VALUES (?, ?, ?)`,
    [name, email, message],
  );

  return { id: result.insertId };
};
