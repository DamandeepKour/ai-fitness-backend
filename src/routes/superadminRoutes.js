import express from "express";
import authMiddleware from "../middleware/authMiddleware.js";
import db from "../config/db.js";
import {
  getAIAnalytics,
  getAIGeneratedMeals,
  getCompleteProfileUsers,
  getSuperadminAnalytics,
  getSuperadminMe,
  getSuperadminUserById,
  getSuperadminUsers,
  updateSuperadminProfile,
} from "../Controllers/superadminController.js";

const router = express.Router();

async function requireSuperadmin(req, res, next) {
  try {
    if (!req.user?.id) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const conn = await db();
    const [rows] = await conn.query("SELECT user_type FROM users WHERE id = ?", [req.user.id]);
    const actor = rows[0];

    if (!actor || actor.user_type !== "superadmin") {
      return res.status(403).json({
        success: false,
        message: "Only superadmin can access this endpoint",
      });
    }

    return next();
  } catch (err) {
    return next(err);
  }
}

router.use(authMiddleware, requireSuperadmin);

router.get("/analytics", getSuperadminAnalytics);
router.get("/ai/analytics", getAIAnalytics);
router.get("/ai/generated-meals", getAIGeneratedMeals);
router.get("/me", getSuperadminMe);
router.put("/profile", updateSuperadminProfile);
router.get("/users", getSuperadminUsers);
router.get("/users/logins", getSuperadminUsers);
router.get("/users/complete-profiles", getCompleteProfileUsers);
router.get("/users/:id", getSuperadminUserById);

export default router;
