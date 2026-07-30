import db from "../config/db.js";
import { getWeeklyWeight } from "../repositories/weightRepo.js";
import { getPantryIngredientList } from "./pantryService.js";
import { generateCoaching } from "../ai/features/coachingGenerator.js";

export async function getVernacularCoachingService(userId) {
  const conn = await db();
  const [users] = await conn.query(
    `SELECT language, goal, diet_type, name FROM users WHERE id = ?`,
    [userId],
  );
  const user = users[0] || {};

  let weightData = [];
  try {
    weightData = await getWeeklyWeight(userId);
  } catch {
    weightData = [];
  }

  let pantry = [];
  try {
    pantry = await getPantryIngredientList(userId);
  } catch {
    pantry = [];
  }

  return generateCoaching({ user, weightData, pantry }, { userId });
}
