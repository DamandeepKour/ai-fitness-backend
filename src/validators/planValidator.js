// src/validators/planValidator.js

import Joi from "joi";

export const planSchema = Joi.object({
  weight: Joi.number().required(),
  height: Joi.number().required(),
  goal: Joi.string().required(),
  diet_type: Joi.string().required(),
});