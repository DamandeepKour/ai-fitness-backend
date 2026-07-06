import Joi from "joi";

const timeField = Joi.string()
  .trim()
  .pattern(/^([01]\d|2[0-3]):[0-5]\d$/)
  .messages({
    "string.pattern.base": "Time must be in HH:MM 24-hour format.",
  });

const booleanField = Joi.alternatives()
  .try(Joi.boolean(), Joi.number().integer().valid(0, 1))
  .optional();

export const updateNotificationPrefsSchema = Joi.object({
  meal_reminders: booleanField,
  water_reminders: booleanField,
  coaching_tips: booleanField,
  goal_milestones: booleanField,
  wind_down: booleanField,
  whatsapp_enabled: booleanField,
  workout_plan_type: Joi.string().valid("daily", "weekly").optional(),
  quiet_start: timeField.optional(),
  quiet_end: timeField.optional(),
}).min(1);
