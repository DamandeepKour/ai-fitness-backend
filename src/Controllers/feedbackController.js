import { getAIFeedbackService } from "../services/feedbackSerive.js";

export const getAIFeedback = async (req, res) => {
    const userId = req.user.id;
  
    const feedback = await getAIFeedbackService(userId);
  
    res.json({
      success: true,
      feedback,
    });
  };

  // export const createAIFeedback = async (req, res) => {
  //   const userId = req.user.id;
  //   const { feedback } = req.body;

  //   const newFeedback = await createAIFeedbackService(userId, feedback);

  //   res.json({
  //     success: true,
  //     newFeedback,
  //   });
  // };