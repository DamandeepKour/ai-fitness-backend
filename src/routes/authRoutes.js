import express from "express";
import {
  signup,
  login,
  logout,
  signupByType,
  loginByType,
} from "../Controllers/authController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/signup", signup);
router.post("/login", login);
router.post("/superadmin/signup", signupByType("superadmin"));
router.post("/superadmin/login", loginByType("superadmin"));
router.post("/staff/signup", signupByType("staff"));
router.post("/staff/login", loginByType("staff"));
router.post("/logout", authMiddleware, logout);

export default router;