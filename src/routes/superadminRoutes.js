import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import { requirePermission, requireRole, requireSelfOrRole } from "../middleware/requireRole.js";
import { ROLES, PERMISSIONS } from "../constants/roles.js";
import {
  getAIAnalytics,
  getAIQualityAnalytics,
  getAIGeneratedMeals,
  getBusinessAnalytics,
  getCoachReviewQueue,
  getCohortAnalytics,
  getCompleteProfileUsers,
  getFunnelAnalytics,
  getHealthAnalytics,
  getNutritionAnalytics,
  getRetentionAnalytics,
  getSuperadminAnalytics,
  getSuperadminMe,
  getSuperadminUserById,
  getSuperadminUsers,
  getSupportTickets,
  getTrafficHistory,
  getTrafficLogs,
  getTrafficSummary,
  getUserActivity,
  updateCoachReviewAdmin,
  updateSuperadminProfile,
  updateSupportTicketStatus,
} from "../Controllers/superadminController.js";

const router = express.Router();

const analytics = requirePermission(PERMISSIONS.ANALYTICS_READ);
const usersManage = requirePermission(PERMISSIONS.USERS_MANAGE);
const systemRead = requirePermission(PERMISSIONS.SYSTEM_READ);
const coachReviews = requirePermission(PERMISSIONS.COACH_REVIEWS_MANAGE);

router.use(authMiddleware);

router.get("/traffic/summary", systemRead, getTrafficSummary);
router.get("/traffic/logs", systemRead, getTrafficLogs);
router.get("/traffic/history", systemRead, getTrafficHistory);
router.get("/traffic/activity", systemRead, getUserActivity);

router.get("/analytics", analytics, getSuperadminAnalytics);
router.get("/ai/analytics", analytics, getAIAnalytics);
router.get("/ai/generated-meals", analytics, getAIGeneratedMeals);
router.get("/business/analytics", analytics, getBusinessAnalytics);
router.get("/health/analytics", analytics, getHealthAnalytics);
router.get("/nutrition/analytics", analytics, getNutritionAnalytics);
router.get("/funnel/analytics", analytics, getFunnelAnalytics);
router.get("/retention/analytics", analytics, getRetentionAnalytics);
router.get("/cohort/analytics", analytics, getCohortAnalytics);
router.get("/ai/quality", analytics, getAIQualityAnalytics);

router.get("/support/tickets", systemRead, getSupportTickets);
router.patch("/support/tickets/:id", systemRead, updateSupportTicketStatus);

router.get("/coach-reviews", coachReviews, getCoachReviewQueue);
router.patch("/coach-reviews/:id", coachReviews, updateCoachReviewAdmin);

router.get("/me", requireRole(ROLES.ADMIN), getSuperadminMe);
router.put("/profile", requireRole(ROLES.ADMIN), updateSuperadminProfile);

router.get("/users", usersManage, getSuperadminUsers);
router.get("/users/logins", usersManage, getSuperadminUsers);
router.get("/users/complete-profiles", usersManage, getCompleteProfileUsers);
router.get("/users/:id", usersManage, getSuperadminUserById);

export default router;
