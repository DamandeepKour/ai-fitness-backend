import { describe, expect, it } from "vitest";
import {
  buildPlanProfileHash,
  planCacheKey,
  stableHash,
} from "../../../src/config/cache.js";

describe("cache helpers", () => {
  it("stableHash is deterministic", () => {
    expect(stableHash({ a: 1, b: "x" })).toBe(stableHash({ a: 1, b: "x" }));
  });

  it("buildPlanProfileHash normalizes goal case and pantry order", () => {
    const a = buildPlanProfileHash(9, {
      weight: 70,
      height: 170,
      goal: "Fat_Loss",
      diet_type: "veg",
      plan_type: "weekly",
      pantry_mode: true,
      pantry_items: ["Rice", "dal", "rice"],
    });
    const b = buildPlanProfileHash(9, {
      weight: 70,
      height: 170,
      goal: "fat_loss",
      diet_type: "veg",
      plan_type: "weekly",
      pantry_mode: true,
      pantry_items: ["dal", "rice"],
    });
    expect(a).toBe(b);
  });

  it("changes hash when weight changes", () => {
    const base = { weight: 70, height: 170, goal: "lose", diet_type: "veg" };
    expect(buildPlanProfileHash(1, base)).not.toBe(
      buildPlanProfileHash(1, { ...base, weight: 71 }),
    );
  });

  it("builds namespaced plan cache key", () => {
    expect(planCacheKey("abc123")).toBe("fitnova:plan:v1:abc123");
  });
});
