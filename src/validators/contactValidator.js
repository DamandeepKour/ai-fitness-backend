import Joi from "joi";

export const contactSchema = Joi.object({
  name: Joi.string().trim().min(2).max(150).required(),
  email: Joi.string().trim().email().max(255).required(),
  message: Joi.string().trim().min(10).max(5000).required(),
});
