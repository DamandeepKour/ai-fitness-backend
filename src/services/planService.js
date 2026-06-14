import generateAIPlan from "./aiService.js";
import { getRedis } from "../config/redis.js";
import { savePlan } from "../repositories/planRepo.js";
import { getPantryIngredientList } from "./pantryService.js";
import { updateUserService } from "./userService.js";

const createPlanService = async (userId, data) => {
  try {
    const profileUpdates = {
      weight: Number(data.weight),
      height: Number(data.height),
      goal: data.goal,
      diet_type: data.diet_type,
    };

    await updateUserService(userId, profileUpdates);

    const cacheKey = [
      "plan",
      userId,
      data.plan_type,
      profileUpdates.weight,
      profileUpdates.height,
      profileUpdates.goal,
      profileUpdates.diet_type,
      data.workout_type || "home",
      data.meal_preference || "any",
      data.budget_tier || "std",
      data.pantry_mode ? "pantry" : "full",
      data.ai_prompt || "",
    ].join(":");

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