import db from "../config/db.js";
import { pantryTable } from "../models/pantryModel.js";

export async function getPantryItemsService(userId) {
  const conn = await db();
  const [rows] = await conn.query(
    `SELECT id, ingredient, qty, unit, created_at
     FROM ${pantryTable}
     WHERE user_id = ?
     ORDER BY ingredient ASC`,
    [userId],
  );
  return rows;
}

export async function addPantryItemService(userId, { ingredient, qty = "1", unit = "portion" }) {
  const conn = await db();
  const name = String(ingredient || "").trim();
  if (!name) throw new Error("Ingredient is required");

  const [existing] = await conn.query(
    `SELECT id FROM ${pantryTable} WHERE user_id = ? AND LOWER(ingredient) = LOWER(?)`,
    [userId, name],
  );

  if (existing[0]) {
    await conn.query(
      `UPDATE ${pantryTable} SET qty = ?, unit = ? WHERE id = ?`,
      [qty, unit, existing[0].id],
    );
    return { id: existing[0].id, ingredient: name, qty, unit };
  }

  const [result] = await conn.query(
    `INSERT INTO ${pantryTable} (user_id, ingredient, qty, unit) VALUES (?, ?, ?, ?)`,
    [userId, name, qty, unit],
  );

  return { id: result.insertId, ingredient: name, qty, unit };
}

export async function removePantryItemService(userId, itemId) {
  const conn = await db();
  const [result] = await conn.query(
    `DELETE FROM ${pantryTable} WHERE id = ? AND user_id = ?`,
    [itemId, userId],
  );
  return result.affectedRows > 0;
}

export async function getPantryIngredientList(userId) {
  const items = await getPantryItemsService(userId);
  return items.map((row) => row.ingredient);
}
