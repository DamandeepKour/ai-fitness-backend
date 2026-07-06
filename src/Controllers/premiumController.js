import {
  connectWearableService,
  disconnectWearableService,
  getAllCoachReviewsService,
  getCoachReviewsForUserService,
  getFamilyPlanService,
  getGroceryListService,
  getLabReportsService,
  getPremiumOverviewService,
  getWearableStatusService,
  requestCoachReviewService,
  saveFamilyPlanService,
  sendWhatsAppReminderDemoService,
  submitLabReportService,
  updateCoachReviewService,
} from "../services/premiumService.js";
import {
  getNotificationPrefsService,
  updateNotificationPrefsService,
} from "../services/notificationService.js";

export async function getPremiumOverview(req, res, next) {
  try {
    const data = await getPremiumOverviewService(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getNotificationPrefs(req, res, next) {
  try {
    const data = await getNotificationPrefsService(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateNotificationPrefs(req, res, next) {
  try {
    const data = await updateNotificationPrefsService(req.user.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function sendWhatsAppDemo(req, res, next) {
  try {
    const data = await sendWhatsAppReminderDemoService(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function requestCoachReview(req, res, next) {
  try {
    const data = await requestCoachReviewService(req.user.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getMyCoachReviews(req, res, next) {
  try {
    const reviews = await getCoachReviewsForUserService(req.user.id);
    res.json({ success: true, data: { reviews } });
  } catch (err) {
    next(err);
  }
}

export async function getFamilyPlan(req, res, next) {
  try {
    const data = await getFamilyPlanService(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function saveFamilyPlan(req, res, next) {
  try {
    const data = await saveFamilyPlanService(req.user.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function submitLabReport(req, res, next) {
  try {
    const data = await submitLabReportService(req.user.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getLabReports(req, res, next) {
  try {
    const reports = await getLabReportsService(req.user.id);
    res.json({ success: true, data: { reports } });
  } catch (err) {
    next(err);
  }
}

export async function getWearableStatus(req, res, next) {
  try {
    const data = await getWearableStatusService(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function connectWearable(req, res, next) {
  try {
    const data = await connectWearableService(req.user.id, req.body);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function disconnectWearable(req, res, next) {
  try {
    const data = await disconnectWearableService(req.user.id);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getGroceryList(req, res, next) {
  try {
    const data = await getGroceryListService(req.user.id, req.query);
    res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

// Superadmin coach queue
export async function getCoachReviewQueue(req, res, next) {
  try {
    const reviews = await getAllCoachReviewsService();
    res.json({ success: true, data: { reviews } });
  } catch (err) {
    next(err);
  }
}

export async function updateCoachReview(req, res, next) {
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
