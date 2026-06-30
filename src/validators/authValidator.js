import Joi from "joi";
import { validateEmailFormat } from "../utils/emailValidator.js";

const emailField = Joi.string()
  .trim()
  .max(254)
  .required()
  .custom((value, helpers) => {
    const message = validateEmailFormat(value);
    if (message) return helpers.error("any.invalid", { message });
    return value.toLowerCase();
  })
  .messages({
    "any.invalid": "{{#message}}",
    "string.empty": "Email is required",
    "any.required": "Email is required",
  });

export const signupSchema = Joi.object({
  name: Joi.string().trim().min(2).max(100).required().messages({
    "string.empty": "Name is required",
    "string.min": "Name must be at least 2 characters",
  }),
  email: emailField,
  password: Joi.string().min(8).max(128).required().pattern(/^(?=.*[A-Za-z])(?=.*\d).+$/).messages({
    "string.empty": "Password is required",
    "string.min": "Password must be at least 8 characters",
    "string.pattern.base": "Password must include letters and numbers",
  }),
  phone: Joi.string().trim().allow("", null),
  mobile_number: Joi.string().trim().allow("", null),
});

export const verifyEmailSchema = Joi.object({
  email: emailField,
});

export const googleAuthSchema = Joi.object({
  credential: Joi.string().trim().min(20).required().messages({
    "string.empty": "Google sign-in failed. Please try again.",
    "any.required": "Google sign-in failed. Please try again.",
  }),
});
