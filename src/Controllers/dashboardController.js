// src/controllers/dashboardController.js

import getDashboardService from "../services/dashboardService.js";
import { isValidYmd, serverCalendarYmd } from "../utils/localDate.js";

export const getDashboard = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const date = isValidYmd(req.query.date) ? req.query.date : serverCalendarYmd();

    const data = await getDashboardService(userId, date);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    next(err);
  }
};