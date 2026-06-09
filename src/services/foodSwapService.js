import { findSwapsForFood } from "../data/indianFoodCatalog.js";
import { getUserPlan } from "../repositories/planRepo.js";

function parseDietPlan(dietPlan) {
  if (!dietPlan) return [];
  if (typeof dietPlan === "string") {
    try {
      return JSON.parse(dietPlan);
    } catch {
      return [];
    }
  }
  return Array.isArray(dietPlan) ? dietPlan : [];
}

export async function swapMealService(userId, { mealType, currentFood, day }) {
  const plan = await getUserPlan(userId);
  const swapResult = findSwapsForFood(currentFood);

  const selected = swapResult.swaps[0];

  return {
    mealType,
    day: day || "Monday",
    original: currentFood,
    swap: selected,
    alternatives: swapResult.swaps,
    planId: plan?.id ?? null,
    message: selected
      ? `Swapped to ${selected.name} — ${selected.reason}. Saves ~₹${Math.max(0, 60 - (selected.cost_inr || 0))}/serving vs typical option.`
      : "No swap available",
  };
}

export async function getPlanSwapSuggestionsService(userId) {
  const plan = await getUserPlan(userId);
  if (!plan?.diet_plan) return { suggestions: [] };

  const days = parseDietPlan(plan.diet_plan);
  const suggestions = [];

  for (const dayPlan of days.slice(0, 3)) {
    const meals = dayPlan.meals || {};
    for (const [mealType, meal] of Object.entries(meals)) {
      if (mealType === "cheat_meal" || !meal?.food) continue;
      const swapResult = findSwapsForFood(meal.food);
      if (swapResult.swaps.length) {
        suggestions.push({
          day: dayPlan.day,
          mealType,
          currentFood: meal.food,
          calories: meal.calories,
          topSwap: swapResult.swaps[0],
          alternatives: swapResult.swaps,
        });
      }
    }
  }

  return { suggestions, planId: plan.id };
}
