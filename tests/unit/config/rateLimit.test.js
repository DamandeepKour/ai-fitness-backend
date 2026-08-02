import { describe, expect, it } from "vitest";
import { RATE_LIMIT_CONFIG } from "../../../src/config/rateLimit.js";

describe("RATE_LIMIT_CONFIG", () => {
  it("provides safe positive defaults", () => {
    expect(RATE_LIMIT_CONFIG.auth.max).toBeGreaterThan(0);
    expect(RATE_LIMIT_CONFIG.aiPlan.max).toBeLessThanOrEqual(RATE_LIMIT_CONFIG.ai.max);
    expect(RATE_LIMIT_CONFIG.api.windowMs).toBeGreaterThan(0);
  });

  it("keeps AI plan limit stricter than general AI", () => {
    expect(RATE_LIMIT_CONFIG.aiPlan.max).toBeLessThan(RATE_LIMIT_CONFIG.ai.max);
  });
});
