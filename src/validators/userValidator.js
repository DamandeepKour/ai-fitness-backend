import Joi from "joi";

const profileFieldMessages = {
  "string.empty": "{{#label}} cannot be empty",
  "any.required": "{{#label}} is required",
};

export const updateUserProfileSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).messages(profileFieldMessages),
  email: Joi.string().trim().email().max(150).messages(profileFieldMessages),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)
    .messages({
      ...profileFieldMessages,
      "string.pattern.base": "Password must include letters and numbers",
    }),
  mobile_number: Joi.string().trim().max(30).allow("", null),
  country_code: Joi.string().trim().max(10).allow("", null),
  language: Joi.string().trim().valid("en", "hi", "hi-en").allow("", null),
  age: Joi.number().integer().min(13).max(120),
  gender: Joi.string()
    .trim()
    .valid("male", "female", "other", "Male", "Female", "Other")
    .insensitive(),
  height: Joi.number().positive().max(300),
  weight: Joi.number().positive().max(500),
  goal: Joi.string()
    .trim()
    .valid("fat_loss", "weight_loss", "maintenance", "muscle_gain", "lose", "gain"),
  diet_type: Joi.string().trim().valid("veg", "veg_egg", "non veg", "non_veg"),
  activity_level: Joi.string().trim().valid("low", "medium", "high", "sedentary", "moderate", "active"),
})
  .min(1)
  .messages({
    "object.min": "At least one profile field is required",
  });

export const createUserSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required(),
  email: Joi.string().trim().email().max(150).required(),
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/)
    .required(),
  mobile_number: Joi.string().trim().max(30).allow("", null),
  country_code: Joi.string().trim().max(10).allow("", null),
  age: Joi.number().integer().min(13).max(120),
  gender: Joi.string().trim().max(10),
  height: Joi.number().positive().max(300),
  weight: Joi.number().positive().max(500),
  goal: Joi.string().trim().max(50),
  diet_type: Joi.string().trim().max(50),
  activity_level: Joi.string().trim().max(50),
});
