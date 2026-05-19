import express from "express";
import { submitContact } from "../Controllers/contactController.js";
import { validate } from "../middleware/validate.js";
import { contactSchema } from "../validators/contactValidator.js";
import { contactLimiter } from "../middleware/rateLimiter.js";

const router = express.Router();

router.post("/", contactLimiter, validate(contactSchema), submitContact);

export default router;
