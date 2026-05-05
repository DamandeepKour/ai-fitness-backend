// src/controllers/dashboardController.js

import getDashboardService from "../services/dashboardService.js";

export const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const data = await getDashboardService(userId);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};