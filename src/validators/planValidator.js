// src/validators/planValidator.js

import Joi from "joi";

export const planSchema = Joi.object({
  weight: Joi.number().required(),
  height: Joi.number().required(),
  goal: Joi.string().required(),
  diet_type: Joi.string().valid("veg", "veg_egg", "non veg", "non_veg").required(),
  plan_type: Joi.string().valid("daily", "weekly").default("weekly"),
  workout_type: Joi.string().valid("home", "gym", "mix", "cardio", "yoga").default("home"),
  workout_focus: Joi.string().valid("balanced", "strength", "cardio", "yoga_mobility", "injury_safe", "weight_loss").optional(),
  injury_notes: Joi.string().optional().allow("").max(500),
  meal_preference: Joi.string().valid("north_indian", "south_indian").optional(),
  include_cheat_meal: Joi.boolean().optional(),
  cheat_day: Joi.string().optional().allow(""),
  ai_prompt: Joi.string().optional().allow("").max(500),
  pantry_mode: Joi.boolean().optional(),
  budget_tier: Joi.string().valid("budget", "standard", "premium").optional(),
});