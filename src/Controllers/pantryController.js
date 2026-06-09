import {
  addPantryItemService,
  getPantryItemsService,
  removePantryItemService,
} from "../services/pantryService.js";
import { getPlanSwapSuggestionsService, swapMealService } from "../services/foodSwapService.js";
import { getVernacularCoachingService } from "../services/coachingService.js";
import { BUDGET_TIERS } from "../data/indianFoodCatalog.js";

export async function getPantryItems(req, res, next) {
  try {
    const items = await getPantryItemsService(req.user.id);
    res.json({ success: true, data: { items } });
  } catch (err) {
    next(err);
  }
}

export async function addPantryItem(req, res, next) {
  try {
    const item = await addPantryItemService(req.user.id, req.body);
    res.json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
}

export async function removePantryItem(req, res, next) {
  try {
    const removed = await removePantryItemService(req.user.id, req.params.id);
    if (!removed) {
      return res.status(404).json({ success: false, message: "Item not found" });
    }
    res.json({ success: true, message: "Removed" });
  } catch (err) {
    next(err);
  }
}

export async function swapMeal(req, res, next) {
  try {
    const data = await swapMealService(req.user.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getSwapSuggestions(req, res, next) {
  try {
    const data = await getPlanSwapSuggestionsService(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getCoaching(req, res, next) {
  try {
    const data = await getVernacularCoachingService(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getBudgetTiers(req, res, next) {
  try {
    res.json({ success: true, data: { tiers: BUDGET_TIERS } });
  } catch (err) {
    next(err);
  }
}
