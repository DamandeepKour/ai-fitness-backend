import Joi from "joi";

export const workoutRequestSchema = Joi.object({
  workout_type: Joi.string()
    .valid("home", "gym", "mix", "cardio", "yoga")
    .default("home")
    .messages({
      "any.only": "workout_type must be home, gym, mix, cardio, or yoga",
    }),
  workout_focus: Joi.string()
    .valid("balanced", "strength", "cardio", "yoga_mobility", "injury_safe", "weight_loss")
    .default("balanced")
    .messages({
      "any.only": "workout_focus must be a supported training focus",
    }),
  injury_notes: Joi.string().trim().allow("").max(500).default(""),
});
