import { getBusinessAnalyticsService } from "../services/businessService.js";
import { getHealthAnalyticsService } from "../services/healthService.js";
import { getNutritionAnalyticsService } from "../services/nutritionService.js";
import {
  getAIQualityAnalyticsService,
  getCohortAnalyticsService,
  getFunnelAnalyticsService,
  getRetentionAnalyticsService,
} from "../services/analyticsService.js";
import {
  getSupportTicketsService,
  updateSupportTicketStatusService,
} from "../services/supportService.js";
import { getAllCoachReviewsService, updateCoachReviewService } from "../services/premiumService.js";
import {
  getAIAnalyticsService,
  getAIGeneratedMealsService,
  getCompleteProfileUsersService,
  getSuperadminAnalyticsService,
  getSuperadminUserByIdService,
  getSuperadminUsersService,
} from "../services/superadminService.js";
import { updateUserService } from "../services/userService.js";
import {
  getTrafficHistoryService,
  getTrafficLogsService,
  getTrafficSummaryService,
  getUserActivityService,
} from "../services/trafficService.js";

export async function getSuperadminAnalytics(req, res, next) {
  try {
    const data = await getSuperadminAnalyticsService();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getSuperadminUsers(req, res, next) {
  try {
    const users = await getSuperadminUsersService();
    res.json({ success: true, data: { users } });
  } catch (err) {
    next(err);
  }
}

export async function getSuperadminMe(req, res, next) {
  try {
    const user = await getSuperadminUserByIdService(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function updateSuperadminProfile(req, res, next) {
  try {
    const result = await updateUserService(req.user.id, req.body);
    res.json({
      success: true,
      message: "Profile updated successfully",
      data: result.user,
    });
  } catch (err) {
    next(err);
  }
}

export async function getSuperadminUserById(req, res, next) {
  try {
    const user = await getSuperadminUserByIdService(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, data: user });
  } catch (err) {
    next(err);
  }
}

export async function getCompleteProfileUsers(req, res, next) {
  try {
    const users = await getCompleteProfileUsersService();
    res.json({ success: true, data: { users } });
  } catch (err) {
    next(err);
  }
}

export async function getAIAnalytics(req, res, next) {
  try {
    const data = await getAIAnalyticsService();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getAIGeneratedMeals(req, res, next) {
  try {
    const limit = req.query.limit || 50;
    const meals = await getAIGeneratedMealsService(limit);
    res.json({ success: true, data: { meals } });
  } catch (err) {
    next(err);
  }
}

export async function getBusinessAnalytics(req, res, next) {
  try {
    const data = await getBusinessAnalyticsService();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getHealthAnalytics(req, res, next) {
  try {
    const data = await getHealthAnalyticsService();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getNutritionAnalytics(req, res, next) {
  try {
    const data = await getNutritionAnalyticsService();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getFunnelAnalytics(req, res, next) {
  try {
    const data = await getFunnelAnalyticsService();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getRetentionAnalytics(req, res, next) {
  try {
    const data = await getRetentionAnalyticsService();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getCohortAnalytics(req, res, next) {
  try {
    const data = await getCohortAnalyticsService();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getAIQualityAnalytics(req, res, next) {
  try {
    const data = await getAIQualityAnalyticsService();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getSupportTickets(req, res, next) {
  try {
    const data = await getSupportTicketsService({
      status: req.query.status,
      limit: req.query.limit,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getCoachReviewQueue(req, res, next) {
  try {
    const reviews = await getAllCoachReviewsService();
    res.json({ success: true, data: { reviews } });
  } catch (err) {
    next(err);
  }
}

export async function updateCoachReviewAdmin(req, res, next) {
  try {
    const data = await updateCoachReviewService(req.params.id, req.body);
    if (!data) {
      return res.status(404).json({ success: false, message: "Review not found" });
    }
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateSupportTicketStatus(req, res, next) {
  try {
    const ticket = await updateSupportTicketStatusService(req.params.id, req.body.status);
    if (!ticket) {
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }
    res.json({ success: true, data: ticket });
  } catch (err) {
    if (err.message === "Invalid ticket status") {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
}

export async function getTrafficSummary(req, res, next) {
  try {
    const data = await getTrafficSummaryService();
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getTrafficLogs(req, res, next) {
  try {
    const data = await getTrafficLogsService({
      page: req.query.page,
      limit: req.query.limit,
      method: req.query.method,
      status: req.query.status,
      path: req.query.path,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getTrafficHistory(req, res, next) {
  try {
    const data = await getTrafficHistoryService({ hours: req.query.hours });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getUserActivity(req, res, next) {
  try {
    const data = await getUserActivityService({
      page: req.query.page,
      limit: req.query.limit,
    });
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
