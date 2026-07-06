import express from "express";
import { createUser, getUsers, getUserById, updateUser, getUserHistory, getCurrentUser } from "../Controllers/userController.js";
import { getNotificationPrefs, updateNotificationPrefs } from "../Controllers/notificationController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import { validate } from "../middleware/validate.js";
import { updateNotificationPrefsSchema } from "../validators/notificationValidator.js";

const router = express.Router();

router.post("/", createUser);
router.put("/update", authMiddleware, updateUser);
router.get("/all-user", authMiddleware,getUsers); 
router.get("/me", authMiddleware, getCurrentUser);
router.get("/history/me", authMiddleware, getUserHistory);
router.get("/notifications", authMiddleware, getNotificationPrefs);
router.put("/notifications", authMiddleware, validate(updateNotificationPrefsSchema), updateNotificationPrefs);
router.get("/:id", authMiddleware, getUserById);

export default router;