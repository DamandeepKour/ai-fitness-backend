import createPlanService from "../services/planService.js";

export const generatePlan = async (req, res, next) => {
  try {
    const userId = req.user.id; // 👈 FROM TOKEN

    const result = await createPlanService(userId, req.body);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
};