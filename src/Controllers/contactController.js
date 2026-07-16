import { submitContactMessage } from "../services/contactService.js";

export const submitContact = async (req, res, next) => {
  try {
    
    const data = await submitContactMessage(req.body);

    res.status(201).json({
      success: true,
      message: "Thanks for reaching out — we'll get back to you within 24 hours.",
      data,
    });
  } catch (err) {
    next(err);
  }
};
