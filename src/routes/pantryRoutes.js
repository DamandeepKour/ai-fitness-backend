import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  addPantryItem,
  getBudgetTiers,
  getCoaching,
  getPantryItems,
  getSwapSuggestions,
  removePantryItem,
  swapMeal,
} from "../Controllers/pantryController.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/", getPantryItems);
router.post("/", addPantryItem);
router.delete("/:id", removePantryItem);
router.post("/swap", swapMeal);
router.get("/swap-suggestions", getSwapSuggestions);
router.get("/coaching", getCoaching);
router.get("/budget-tiers", getBudgetTiers);

export default router;
