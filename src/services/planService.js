import { redis } from "../config/redis.js";
import { generateAIPlan } from "./aiService.js";
import { savePlan } from "../repositories/planRepo.js";

export const createPlanService = async (userId, data) => {
  const cacheKey = `plan:${userId}`;

  const cached = await redis.get(cacheKey);
  if (cached) return JSON.parse(cached);

  const aiData = await generateAIPlan(data);

  await savePlan(userId, aiData);

  await redis.set(cacheKey, JSON.stringify(aiData), "EX", 3600);

  return aiData;
};