import { getWeeklyProgressService } from "../services/weightService.js"

export const getWeeklyProgress = async (req, res) => {
    const userId = req.user.id;
  
    const data = await getWeeklyProgressService(userId);
  
    res.json({ success: true, data });
  };