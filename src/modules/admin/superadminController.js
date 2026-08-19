import { getBusinessAnalyticsService } from "./businessService.js";
import { getHealthAnalyticsService } from "../../services/healthService.js";
import { getNutritionAnalyticsService } from "../meals/nutritionService.js";
import {
  getAIQualityAnalyticsService,
  getCohortAnalyticsService,
  getFunnelAnalyticsService,
  getRetentionAnalyticsService,
} from "../analytics/analyticsService.js";
import {
  getSupportTicketsService,
  updateSupportTicketStatusService,
} from "./supportService.js";
import { getAllCoachReviewsService, updateCoachReviewService } from "../plans/premiumService.js";
import {
  getAIAnalyticsService,
  getAIGeneratedMealsService,
  getCompleteProfileUsersService,
  getSuperadminAnalyticsService,
  getSuperadminUserByIdService,
  getSuperadminUsersService,
} from "./superadminService.js";
import { updateUserService } from "../users/userService.js";
import {
  getTrafficHistoryService,
  getTrafficLogsService,
  getTrafficSummaryService,
  getUserActivityService,
} from "../analytics/trafficService.js";
import { AUDIT_ACTIONS, logAction } from "../../utils/auditLog.js";
import {
  getFitnovaAnalyticsOverviewService,
  getFitnovaAiUsageService,
  getFitnovaMetricService,
} from "../analytics/fitnovaAnalyticsService.js";
import { sendCsv } from "../../utils/csvExport.js";
import { getAdminDigestService } from "./adminDigestService.js";
import { renderDigestPdf } from "./adminDigestPdf.js";

function logAdminAction(req, {
  status = "success",
  actionName,
  targetId = null,
  message = null,
  meta = null,
}) {
  logAction({
    action: AUDIT_ACTIONS.ADMIN_ACTION,
    status,
    req,
    userId: req.user?.id ?? null,
    message,
    meta: {
      adminAction: actionName,
      actorRole: req.user?.user_type ?? null,
      targetId,
      ...meta,
    },
  });
}

export async function getFitnovaAnalyticsOverview(req, res, next) {
  try {
    const data = await getFitnovaAnalyticsOverviewService(req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getFitnovaAiUsageAnalytics(req, res, next) {
  try {
    const data = await getFitnovaAiUsageService(req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getFitnovaAnalyticsMetric(req, res, next) {
  try {
    const data = await getFitnovaMetricService(req.params.metric, req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

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

    if (req.query.format === "csv") {
      return sendCsv(res, "users.csv", users, [
        { key: "id", label: "ID" },
        { key: "name", label: "Name" },
        { key: "email", label: "Email" },
        { key: "user_type", label: "Type" },
        { key: "created_at", label: "Signed Up" },
        { key: "last_updated_at", label: "Last Updated" },
        { key: "last_login", label: "Last Login" },
        { key: "is_active", label: "Active (30d)" },
      ]);
    }

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
    logAdminAction(req, {
      actionName: "update_profile",
      targetId: req.user.id,
      meta: { fields: Object.keys(req.body || {}) },
    });
    res.json({
      success: true,
      message: "Profile updated successfully",
      data: result.user,
    });
  } catch (err) {
    logAdminAction(req, {
      status: "error",
      actionName: "update_profile",
      targetId: req.user?.id,
      message: err.message,
    });
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

    if (req.query.format === "csv") {
      return sendCsv(res, "top-foods.csv", data.topFoods, [
        { key: "name", label: "Food" },
        { key: "logs", label: "Log Count" },
        { key: "kcal", label: "Avg Calories" },
      ]);
    }

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

/** Daily/weekly admin digest — signups, active users, plans, meal logging, AI usage, retention. */
export async function getAdminDigest(req, res, next) {
  try {
    const period = req.query.period === "weekly" ? "weekly" : "daily";
    const digest = await getAdminDigestService(period);

    if (req.query.format === "csv") {
      return sendCsv(res, `admin-digest-${period}.csv`, [digest.summary]);
    }

    if (req.query.format === "pdf") {
      const pdfBuffer = await renderDigestPdf(digest);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="admin-digest-${period}.pdf"`);
      return res.status(200).send(pdfBuffer);
    }

    res.json({ success: true, data: digest });
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
      logAdminAction(req, {
        status: "failure",
        actionName: "update_coach_review",
        targetId: req.params.id,
        message: "Review not found",
      });
      return res.status(404).json({ success: false, message: "Review not found" });
    }
    logAdminAction(req, {
      actionName: "update_coach_review",
      targetId: req.params.id,
      meta: { fields: Object.keys(req.body || {}) },
    });
    res.json({ success: true, data });
  } catch (err) {
    logAdminAction(req, {
      status: "error",
      actionName: "update_coach_review",
      targetId: req.params.id,
      message: err.message,
    });
    next(err);
  }
}

export async function updateSupportTicketStatus(req, res, next) {
  try {
    const ticket = await updateSupportTicketStatusService(req.params.id, req.body.status);
    if (!ticket) {
      logAdminAction(req, {
        status: "failure",
        actionName: "update_support_ticket",
        targetId: req.params.id,
        message: "Ticket not found",
      });
      return res.status(404).json({ success: false, message: "Ticket not found" });
    }
    logAdminAction(req, {
      actionName: "update_support_ticket",
      targetId: req.params.id,
      meta: { status: req.body.status },
    });
    res.json({ success: true, data: ticket });
  } catch (err) {
    logAdminAction(req, {
      status: "error",
      actionName: "update_support_ticket",
      targetId: req.params.id,
      message: err.message,
      meta: { status: req.body?.status },
    });
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
