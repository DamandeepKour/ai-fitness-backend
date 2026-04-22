import createPlanService from "../services/planService.js";

export const generatePlan = async (req, res, next) => {
  try {
    const { user_id } = req.body;

    const result = await createPlanService(user_id, req.body);

    res.json({
      success: true,
      data: result,
    });

  } catch (err) {
    next(err);
  }
};