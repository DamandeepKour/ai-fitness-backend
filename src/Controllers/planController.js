import { createPlanService } from "../services/planService.js";
export const generatePlan = async (req, res, next) => {
    try {
      const { user_id } = req.body;
  
      console.log("Generating plan for user:", user_id);
  
      const result = await createPlanService(user_id, req.body);
  
      res.json(result);
    } catch (err) {
      next(err);
    }
  };