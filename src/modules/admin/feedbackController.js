import { getAIFeedbackService } from "./feedbackSerive.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";

export const getAIFeedback = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const feedback = await getAIFeedbackService(userId);

  res.json({
    success: true,
    feedback,
  });
});
