import Joi from "joi";

const MEAL_TYPES = [
  "morning_drink",
  "breakfast",
  "mid_morning_snack",
  "lunch",
  "evening_snack",
  "dinner",
  "after_dinner",
  "snack",
  "snacks",
];

export const addDailyLogSchema = Joi.object({
  meal_type: Joi.string()
    .trim()
    .valid(...MEAL_TYPES)
    .required()
    .messages({
      "any.only": "meal_type must be a supported meal slot",
      "any.required": "meal_type is required",
    }),
  food_name: Joi.string().trim().min(1).max(255).required().messages({
    "string.empty": "food_name is required",
    "any.required": "food_name is required",
  }),
  calories: Joi.number().integer().min(0).max(10000).required(),
  protein: Joi.number().integer().min(0).max(1000).default(0),
  carbs: Joi.number().integer().min(0).max(1000).default(0),
  fat: Joi.number().integer().min(0).max(1000).default(0),
  log_date: Joi.string()
    .trim()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .messages({
      "string.pattern.base": "log_date must be YYYY-MM-DD",
    }),
});

export const dailySummaryQuerySchema = Joi.object({
  date: Joi.string()
    .trim()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .messages({
      "string.pattern.base": "date must be YYYY-MM-DD",
    }),
});

export const explainMealQuerySchema = Joi.object({
  meal_type: Joi.string()
    .trim()
    .valid(...MEAL_TYPES)
    .required()
    .messages({
      "any.only": "meal_type must be a supported meal slot",
      "any.required": "meal_type is required",
    }),
  date: Joi.string()
    .trim()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .messages({
      "string.pattern.base": "date must be YYYY-MM-DD",
    }),
});
