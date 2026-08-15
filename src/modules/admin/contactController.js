import { submitContactMessage } from "./contactService.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";

export const submitContact = asyncHandler(async (req, res) => {
  const data = await submitContactMessage(req.body);

  res.status(201).json({
    success: true,
    message: "Thanks for reaching out — we'll get back to you within 24 hours.",
    data,
  });
});
