import express from "express";
import {
  signup,
  login,
  logout,
  signupByType,
  loginByType,
  magicLogin,
  forgotPassword,
  resetPassword,
  verifyEmail,
  googleAuth,
} from "../Controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/verify-email", verifyEmail);
router.post("/google", googleAuth);
router.post("/login", login);
router.post("/magic-login", magicLogin);
router.get("/magic-login", magicLogin);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/superadmin/signup", signupByType("superadmin"));
router.post("/superadmin/login", loginByType("superadmin"));
router.post("/staff/signup", signupByType("staff"));
router.post("/staff/login", loginByType("staff"));
router.post("/logout", authMiddleware, logout);

export default router;