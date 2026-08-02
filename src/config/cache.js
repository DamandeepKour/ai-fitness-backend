import { createHash } from "node:crypto";
import { getRedis } from "../config/redis.js";
import { logger } from "./logger.js";

function envInt(name, fallback) {
  const raw = process.env[name];
  if (raw === undefined || raw === "") return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value > 0 ? value : fallback;
}

export const CACHE_TTL = {
  plan: envInt("PLAN_CACHE_TTL_SEC", 3600),
  analyticsOverview: envInt("ANALYTICS_OVERVIEW_TTL_SEC", 120),
  analyticsAiUsage: envInt("ANALYTICS_AI_USAGE_TTL_SEC", 120),
  analyticsSuperadmin: envInt("ANALYTICS_SUPERADMIN_TTL_SEC", 60),
  analyticsAiPlans: envInt("ANALYTICS_AI_PLANS_TTL_SEC", 60),
};

export const CACHE_PREFIX = {
  plan: "fitnova:plan:v1",
  planUserIndex: "fitnova:plan:user",
  analyticsOverview: "fitnova:analytics:overview:v1",
  analyticsAiUsage: "fitnova:analytics:ai-usage:v1",
  analyticsSuperadmin: "fitnova:analytics:superadmin:v1",
  analyticsAiPlans: "fitnova:analytics:ai-plans:v1",
};

/** Fields that affect AI plan outputs / cache validity. */
export const PLAN_PROFILE_FIELDS = [
  "weight",
  "height",
  "goal",
  "diet_type",
  "age",
  "gender",
  "activity_level",
];

export function stableHash(value) {
  const json = typeof value === "string" ? value : JSON.stringify(value);
  return createHash("sha256").update(json).digest("hex").slice(0, 24);
}

/**
 * Canonical profile + plan-input hash for AI plan cache keys.
 */
export function buildPlanProfileHash(userId, data = {}) {
  const pantryItems = Array.isArray(data.pantry_items)
    ? [...new Set(
      data.pantry_items
        .map((item) => String(item).toLowerCase().trim())
        .filter(Boolean),
    )].sort()
    : [];

  const payload = {
    userId: Number(userId),
    plan_type: data.plan_type || "weekly",
    weight: Number(data.weight),
    height: Number(data.height),
    goal: String(data.goal || "").toLowerCase().trim(),
    diet_type: String(data.diet_type || "").toLowerCase().trim(),
    workout_type: data.workout_type || "home",
    workout_focus: data.workout_focus || "balanced",
    injury_notes: String(data.injury_notes || "").trim(),
    meal_preference: data.meal_preference || "any",
    budget_tier: data.budget_tier || "std",
    pantry_mode: Boolean(data.pantry_mode),
    pantry_items: data.pantry_mode ? pantryItems : [],
    ai_prompt: String(data.ai_prompt || "").trim(),
    include_cheat_meal: Boolean(data.include_cheat_meal),
    cheat_day: data.cheat_day || null,
  };

  return stableHash(payload);
}

export function planCacheKey(profileHash) {
  return `${CACHE_PREFIX.plan}:${profileHash}`;
}

export function planUserIndexKey(userId) {
  return `${CACHE_PREFIX.planUserIndex}:${userId}`;
}

export function analyticsOverviewCacheKey(range) {
  return `${CACHE_PREFIX.analyticsOverview}:${stableHash(range)}`;
}

export function analyticsAiUsageCacheKey(range) {
  return `${CACHE_PREFIX.analyticsAiUsage}:${stableHash(range)}`;
}

export async function cacheGet(key) {
  const redis = getRedis();
  if (!redis) return null;

  try {
    const raw = await redis.get(key);
    if (raw == null) return null;
    return JSON.parse(raw);
  } catch (err) {
    logger.warn({ type: "cache", key, err: err.message }, "cache get failed");
    return null;
  }
}

export async function cacheSet(key, value, ttlSeconds) {
  const redis = getRedis();
  if (!redis) return false;

  try {
    const payload = JSON.stringify(value);
    if (ttlSeconds > 0) {
      await redis.set(key, payload, "EX", ttlSeconds);
    } else {
      await redis.set(key, payload);
    }
    return true;
  } catch (err) {
    logger.warn({ type: "cache", key, err: err.message }, "cache set failed");
    return false;
  }
}

export async function cacheDel(...keys) {
  const redis = getRedis();
  if (!redis || !keys.length) return 0;

  try {
    return await redis.del(...keys);
  } catch (err) {
    logger.warn({ type: "cache", err: err.message }, "cache delete failed");
    return 0;
  }
}

/**
 * Remember a plan cache key under the user so we can invalidate on profile/goal change.
 */
export async function trackPlanCacheKey(userId, key, ttlSeconds = CACHE_TTL.plan) {
  const redis = getRedis();
  if (!redis) return;

  const indexKey = planUserIndexKey(userId);
  try {
    await redis.sadd(indexKey, key);
    await redis.expire(indexKey, Math.max(ttlSeconds * 2, ttlSeconds + 60));
  } catch (err) {
    logger.warn({ type: "cache", userId, err: err.message }, "plan cache index update failed");
  }
}

export async function invalidateUserPlanCache(userId) {
  const redis = getRedis();
  if (!redis || userId == null) return { deleted: 0 };

  const indexKey = planUserIndexKey(userId);
  try {
    const keys = await redis.smembers(indexKey);
    if (keys.length) {
      await redis.del(...keys);
    }
    await redis.del(indexKey);
    logger.info(
      { type: "cache", userId, deleted: keys.length },
      "Invalidated user plan cache",
    );
    return { deleted: keys.length };
  } catch (err) {
    logger.warn({ type: "cache", userId, err: err.message }, "plan cache invalidation failed");
    return { deleted: 0 };
  }
}

export async function invalidateAnalyticsCaches() {
  const redis = getRedis();
  if (!redis) return { deleted: 0 };

  try {
    // Short-lived analytics keys — scan by prefix in batches.
    const patterns = [
      `${CACHE_PREFIX.analyticsOverview}:*`,
      `${CACHE_PREFIX.analyticsAiUsage}:*`,
      CACHE_PREFIX.analyticsSuperadmin,
      CACHE_PREFIX.analyticsAiPlans,
    ];

    let deleted = 0;
    for (const pattern of patterns) {
      deleted += await deleteByPattern(redis, pattern);
    }

    if (deleted > 0) {
      logger.info({ type: "cache", deleted }, "Invalidated analytics caches");
    }
    return { deleted };
  } catch (err) {
    logger.warn({ type: "cache", err: err.message }, "analytics cache invalidation failed");
    return { deleted: 0 };
  }
}

async function deleteByPattern(redis, pattern) {
  if (!pattern.includes("*")) {
    return redis.del(pattern);
  }

  let cursor = "0";
  let deleted = 0;

  do {
    const [next, keys] = await redis.scan(cursor, "MATCH", pattern, "COUNT", 100);
    cursor = next;
    if (keys.length) {
      deleted += await redis.del(...keys);
    }
  } while (cursor !== "0");

  return deleted;
}

/**
 * Invalidate plan + analytics caches when profile/goal-related fields change.
 */
export async function invalidateCachesForProfileChange(userId, changedFields = []) {
  const relevant = changedFields.filter((field) => PLAN_PROFILE_FIELDS.includes(field));
  if (!relevant.length) return;

  await invalidateUserPlanCache(userId);

  // Goal/diet shifts affect analytics goal distribution & related KPIs.
  if (relevant.some((f) => f === "goal" || f === "diet_type")) {
    await invalidateAnalyticsCaches();
  }
}
