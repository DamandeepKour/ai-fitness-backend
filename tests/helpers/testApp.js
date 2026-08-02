import jwt from "jsonwebtoken";
import { createApp } from "../../src/app.js";

export function buildTestApp(options = {}) {
  return createApp({
    enableApiLimiter: false,
    enableTraffic: false,
    enableRequestLogger: false,
    ...options,
  });
}

export function makeAuthToken(payload = {}) {
  return jwt.sign(
    {
      id: payload.id ?? 1,
      email: payload.email ?? "tester@example.com",
      user_type: payload.user_type ?? "user",
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "1h" },
  );
}

export const samplePlanBody = {
  weight: 70,
  height: 170,
  goal: "fat_loss",
  diet_type: "veg",
  plan_type: "weekly",
  workout_type: "home",
  workout_focus: "balanced",
};

export const sampleMealBody = {
  meal_type: "breakfast",
  food_name: "Oats with milk",
  calories: 320,
  protein: 12,
  carbs: 48,
  fat: 8,
  log_date: "2026-08-02",
};
