import {
  getNotificationPrefsService,
  updateNotificationPrefsService,
} from "../services/notificationService.js";

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
    res.json({
      success: true,
      message: "Notification preferences updated.",
      data,
    });
  } catch (err) {
    if (
      err.message?.includes("Invalid") ||
      err.message?.includes("Time must") ||
      err.message?.includes("workout_plan_type")
    ) {
      return res.status(400).json({ success: false, message: err.message });
    }
    next(err);
  }
}
