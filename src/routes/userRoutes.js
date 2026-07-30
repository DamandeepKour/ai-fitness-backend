import express from "express";
import { createUser, getUsers, getUserById, updateUser, getUserHistory, getCurrentUser } from "../Controllers/userController.js";
import { getNotificationPrefs, updateNotificationPrefs } from "../Controllers/notificationController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import { updateNotificationPrefsSchema } from "../validators/notificationValidator.js";
import { createUserSchema, updateUserProfileSchema } from "../validators/userValidator.js";
import { requireRole, requireSelfOrRole } from "../middleware/requireRole.js";
import { ROLES } from "../constants/roles.js";

const router = express.Router();

router.post("/", validate(createUserSchema), createUser);
router.put("/update", authMiddleware, validate(updateUserProfileSchema), updateUser);
router.get("/all-user", authMiddleware, requireRole(ROLES.ADMIN), getUsers);
router.get("/me", authMiddleware, getCurrentUser);
router.get("/history/me", authMiddleware, getUserHistory);
router.get("/notifications", authMiddleware, getNotificationPrefs);
router.put("/notifications", authMiddleware, validate(updateNotificationPrefsSchema), updateNotificationPrefs);
router.get("/:id", authMiddleware, requireSelfOrRole("id", ROLES.ADMIN), getUserById);

export default router;