import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import {
  connectWearable,
  disconnectWearable,
  getFamilyPlan,
  getGroceryList,
  getLabReports,
  getMyCoachReviews,
  getNotificationPrefs,
  getPremiumOverview,
  getWearableStatus,
  requestCoachReview,
  saveFamilyPlan,
  sendWhatsAppDemo,
  submitLabReport,
  updateNotificationPrefs,
} from "../Controllers/premiumController.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/overview", getPremiumOverview);
router.get("/notifications", getNotificationPrefs);
router.put("/notifications", updateNotificationPrefs);
router.post("/whatsapp/demo", sendWhatsAppDemo);
router.post("/coach-review", requestCoachReview);
router.get("/coach-review", getMyCoachReviews);
router.get("/family", getFamilyPlan);
router.put("/family", saveFamilyPlan);
router.post("/lab-report", submitLabReport);
router.get("/lab-reports", getLabReports);
router.get("/wearable", getWearableStatus);
router.post("/wearable/connect", connectWearable);
router.post("/wearable/disconnect", disconnectWearable);
router.get("/grocery", getGroceryList);

export default router;
