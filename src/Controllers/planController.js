import createPlanService from "../services/planService.js";
import { asyncHandler } from "../middleware/asyncHandler.js";

export const generatePlan = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const result = await createPlanService(userId, req.body);

  res.json({
    success: true,
    data: result,
  });
});
