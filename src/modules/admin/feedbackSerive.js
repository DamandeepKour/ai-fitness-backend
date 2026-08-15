import { getWeeklyWeight } from "../plans/weightRepo.js";
import { generateFeedback } from "../ai/features/feedbackGenerator.js";

export const getAIFeedbackService = async (userId) => {
  const weightData = await getWeeklyWeight(userId);
  const { feedback } = await generateFeedback(weightData, { userId });
  return feedback;
};
