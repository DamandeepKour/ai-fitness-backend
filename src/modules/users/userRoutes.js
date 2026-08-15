import express from "express";
import { createUser, getUsers, getUserById, updateUser, getUserHistory, getCurrentUser } from "./userController.js";
import { getNotificationPrefs, updateNotificationPrefs } from "../notifications/notificationController.js";
import authMiddleware from "../auth/authMiddleware.js";
import { validate } from "../../middleware/validate.js";
import { updateNotificationPrefsSchema } from "../notifications/notificationValidator.js";
import { createUserSchema, updateUserProfileSchema } from "./userValidator.js";
import { requireRole, requireSelfOrRole } from "../auth/requireRole.js";
import { ROLES } from "../auth/roles.js";

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