import Joi from "joi";
import { workoutRequestSchema } from "../workouts/workoutValidator.js";

export const aiPlanRequestSchema = Joi.object({
  weight: Joi.number().positive().max(500).required().messages({
    "any.required": "weight is required",
    "number.positive": "weight must be a positive number",
  }),
  height: Joi.number().positive().max(300).required().messages({
    "any.required": "height is required",
    "number.positive": "height must be a positive number",
  }),
  goal: Joi.string()
    .trim()
    .valid("fat_loss", "weight_loss", "maintenance", "maintain", "muscle_gain", "body_recomp", "lose", "gain")
    .required()
    .messages({
      "any.required": "goal is required",
    }),
  diet_type: Joi.string()
    .trim()
    .valid("veg", "veg_egg", "non veg", "non_veg", "jain")
    .required()
    .messages({
      "any.required": "diet_type is required",
      "any.only": "diet_type must be veg, veg_egg, non veg, or jain",
    }),
  plan_type: Joi.string().valid("daily", "weekly").default("weekly"),
  meal_preference: Joi.string().valid("north_indian", "south_indian").optional(),
  include_cheat_meal: Joi.boolean().optional(),
  cheat_day: Joi.string().trim().allow("").optional(),
  ai_prompt: Joi.string().trim().allow("").max(500).optional(),
  pantry_mode: Joi.boolean().optional(),
  budget_tier: Joi.string().valid("budget", "standard", "premium").optional(),
})
  .concat(workoutRequestSchema);
