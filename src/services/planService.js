import generateAIPlan from "./aiService.js";
import { getRedis } from "../config/redis.js";
import { savePlan } from "../repositories/planRepo.js";
import { getPantryIngredientList } from "./pantryService.js";

const createPlanService = async (userId, data) => {
  try {
    const cacheKey = `plan:${userId}:${data.plan_type}:${data.budget_tier || "std"}:${data.pantry_mode ? "pantry" : "full"}`;

    const redis = getRedis();
    if (redis) {
      const cached = await redis.get(cacheKey);
      if (cached) return JSON.parse(cached);
    }

    const planInput = { ...data };
    if (data.pantry_mode) {
      planInput.pantry_items = await getPantryIngredientList(userId);
    }

    const aiData = await generateAIPlan(planInput);

    await savePlan(userId, aiData);

    if (redis) {
      await redis.set(cacheKey, JSON.stringify(aiData), "EX", 3600);
    }

    return aiData;

  } catch (error) {
    console.error("Plan Service Error:", error.message);
    throw error;
  }
};

export default createPlanService;