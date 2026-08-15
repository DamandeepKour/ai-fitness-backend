import { getWeeklyWeight } from "../plans/weightRepo.js";
import { getPlateauStatusService } from "../plans/weightService.js";
import { generateFeedback } from "../ai/features/feedbackGenerator.js";

export const getAIFeedbackService = async (userId) => {
  const weightData = await getWeeklyWeight(userId);
  const plateau = await getPlateauStatusService(userId);
  const { feedback } = await generateFeedback(weightData, { userId, plateau });
  return feedback;
};
