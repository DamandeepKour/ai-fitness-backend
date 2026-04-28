import { getAIFeedbackService } from "../services/feedbackSerive.js";

export const getAIFeedback = async (req, res) => {
    const userId = req.user.id;
  
    const feedback = await getAIFeedbackService(userId);
  
    res.json({
      success: true,
      feedback,
    });
  };