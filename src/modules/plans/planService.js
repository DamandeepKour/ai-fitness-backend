import generateAIPlan from "../ai/aiService.js";
import { savePlan } from "./planRepo.js";
import { getPantryIngredientList } from "../meals/pantryService.js";
import { updateUserService } from "../users/userService.js";
import {
  buildPlanProfileHash,
  CACHE_TTL,
  cacheGet,
  cacheSet,
  planCacheKey,
  trackPlanCacheKey,
} from "../../config/cache.js";
import { logger } from "../../config/logger.js";

const createPlanService = async (userId, data) => {
  try {
    const planInput = { ...data };
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

export default createPlanService;
