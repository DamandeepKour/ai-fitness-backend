import generateAIPlan from "../ai/aiService.js";
import { generatePlanExplanation } from "../ai/features/explainPlanGenerator.js";
import { savePlan, getUserPlan } from "./planRepo.js";
import { getPantryIngredientList } from "../meals/pantryService.js";
import { updateUserService, getUserByIdService } from "../users/userService.js";
import {
  buildPlanProfileHash,
  CACHE_TTL,
  cacheGet,
  cacheSet,
  planCacheKey,
  trackPlanCacheKey,
} from "../../config/cache.js";
import { logger } from "../../config/logger.js";
import { AppError } from "../../utils/AppError.js";

const createPlanService = async (userId, data) => {
  try {
    const planInput = { ...data };

    // Default meal_preference (north/south Indian) from the user's saved
    // region profile field when the caller doesn't specify one per-request.
    if (!planInput.meal_preference) {
      const existingUser = await getUserByIdService(userId);
      if (existingUser?.region) {
        planInput.meal_preference = existingUser.region;
      }
    }

    if (data.pantry_mode) {
      planInput.pantry_items = await getPantryIngredientList(userId);
    }

    const profileHash = buildPlanProfileHash(userId, planInput);
    const cacheKey = planCacheKey(profileHash);

    const cached = await cacheGet(cacheKey);
    if (cached) {
      logger.info(
        { type: "cache", userId, profileHash, hit: true },
        "AI plan cache hit",
      );
      return cached;
    }

    const profileUpdates = {
      weight: Number(data.weight),
      height: Number(data.height),
      goal: data.goal,
      diet_type: data.diet_type,
    };

    await updateUserService(userId, profileUpdates);

    const aiResult = await generateAIPlan(planInput, { userId });
    const { aiMeta, ...aiData } = aiResult;

    await savePlan(userId, aiData);

    const ttl = CACHE_TTL.plan;
    await cacheSet(cacheKey, aiData, ttl);
    await trackPlanCacheKey(userId, cacheKey, ttl);

    logger.info(
      { type: "cache", userId, profileHash, hit: false, ttl },
      "AI plan cache stored",
    );

    return aiData;
  } catch (error) {
    logger.error({ type: "plan", err: error.message, userId }, "Plan Service Error");
    throw error;
  }
};

function parseJsonColumn(value, fallback) {
  if (!value) return fallback;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return fallback;
    }
  }
  return value;
}

/** "Why this plan" — explains the user's current saved plan. */
export const explainPlanService = async (userId) => {
  const plan = await getUserPlan(userId);
  if (!plan) {
    throw new AppError("No saved plan found — generate a plan first.", 404, null, "PLAN_NOT_FOUND");
  }

  const user = await getUserByIdService(userId);

  const context = {
    goal: plan.goal ?? user?.goal ?? null,
    diet_type: user?.diet_type ?? null,
  };

  const normalizedPlan = {
    calories: plan.calories,
    diet_plan: parseJsonColumn(plan.diet_plan, []),
    workout_plan: parseJsonColumn(plan.workout_plan, []),
  };

  const { explanation, aiMeta } = await generatePlanExplanation(normalizedPlan, context, { userId });

  return { explanation, aiMeta };
};

export default createPlanService;
