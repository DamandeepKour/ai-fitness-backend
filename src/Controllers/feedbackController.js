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

  export const getAIFeedbackList = async (req, res) => {
    const feedbackList = await getAIFeedbackListService();

    res.json({
      success: true,
      feedbackList,
    });
  };

  export const getAIFeedbackDetail = async (req, res) => {
    const { id } = req.params;
    const feedbackDetail = await getAIFeedbackDetailService(id);

    res.json({
      success: true,
      feedbackDetail,
    });
  };