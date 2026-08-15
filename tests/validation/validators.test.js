import { describe, expect, it } from "vitest";
import { signupSchema } from "../../src/modules/auth/authValidator.js";
import { addDailyLogSchema } from "../../src/modules/meals/dailyLogValidator.js";
import { aiPlanRequestSchema } from "../../src/modules/ai/aiRequestValidator.js";

describe("signupSchema edge cases", () => {
  it("accepts valid signup payload", () => {
    const { error } = signupSchema.validate({
      name: "Daman",
      email: "daman@example.com",
      password: "Secret123",
    });
    expect(error).toBeUndefined();
  });

  it("rejects short password without digits", () => {
    const { error } = signupSchema.validate({
      name: "Daman",
      email: "daman@example.com",
      password: "short",
    });
    expect(error).toBeTruthy();
  });

  it("rejects disposable-looking invalid email format", () => {
    const { error } = signupSchema.validate({
      name: "Daman",
      email: "not-an-email",
      password: "Secret123",
    });
    expect(error).toBeTruthy();
  });

  it("rejects name that is too short", () => {
    const { error } = signupSchema.validate({
      name: "A",
      email: "a@example.com",
      password: "Secret123",
    });
    expect(error).toBeTruthy();
  });
});

describe("addDailyLogSchema edge cases", () => {
  it("accepts valid meal log", () => {
    const { error, value } = addDailyLogSchema.validate({
      meal_type: "breakfast",
      food_name: "Idli",
      calories: 200,
      protein: 8,
    });
    expect(error).toBeUndefined();
    expect(value.carbs).toBe(0);
  });

  it("rejects unknown meal_type", () => {
    const { error } = addDailyLogSchema.validate({
      meal_type: "brunch",
      food_name: "Toast",
      calories: 100,
    });
    expect(error).toBeTruthy();
  });

  it("rejects negative calories", () => {
    const { error } = addDailyLogSchema.validate({
      meal_type: "lunch",
      food_name: "Rice",
      calories: -1,
    });
    expect(error).toBeTruthy();
  });

  it("rejects bad log_date format", () => {
    const { error } = addDailyLogSchema.validate({
      meal_type: "dinner",
      food_name: "Soup",
      calories: 150,
      log_date: "02-08-2026",
    });
    expect(error).toBeTruthy();
  });

  it("rejects calories above max", () => {
    const { error } = addDailyLogSchema.validate({
      meal_type: "dinner",
      food_name: "Feast",
      calories: 10001,
    });
    expect(error).toBeTruthy();
  });
});

describe("aiPlanRequestSchema edge cases", () => {
  const valid = {
    weight: 70,
    height: 170,
    goal: "fat_loss",
    diet_type: "veg",
    plan_type: "weekly",
    workout_type: "home",
  };

  it("accepts weekly plan request", () => {
    const { error } = aiPlanRequestSchema.validate(valid);
    expect(error).toBeUndefined();
  });

  it("rejects missing goal", () => {
    const { goal, ...rest } = valid;
    const { error } = aiPlanRequestSchema.validate(rest);
    expect(error).toBeTruthy();
  });

  it("rejects invalid diet_type", () => {
    const { error } = aiPlanRequestSchema.validate({ ...valid, diet_type: "keto" });
    expect(error).toBeTruthy();
  });

  it("rejects oversized ai_prompt", () => {
    const { error } = aiPlanRequestSchema.validate({
      ...valid,
      ai_prompt: "x".repeat(501),
    });
    expect(error).toBeTruthy();
  });

  it("rejects non-positive weight", () => {
    const { error } = aiPlanRequestSchema.validate({ ...valid, weight: 0 });
    expect(error).toBeTruthy();
  });
});
