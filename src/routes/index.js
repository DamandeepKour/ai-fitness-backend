import express from 'express';
import planRoutes from '../modules/plans/planRoutes.js';
import userRoutes from '../modules/users/userRoutes.js';
import authRoutes from '../modules/auth/authRoutes.js';
import dailyLogRoutes from "../modules/meals/dailyLogRoutes.js";
import weightRoutes  from "../modules/plans/weightRoutes.js";
import progressRoutes from "../modules/plans/progressRoutes.js";
import feedbackRoutes from "../modules/admin/feedbackRoutes.js";
import dashboardRoutes from "../modules/analytics/dashboardRoutes.js";
import contactRoutes from "../modules/admin/contactRoutes.js";
import superadminRoutes from "../modules/admin/superadminRoutes.js";
import pantryRoutes from "../modules/meals/pantryRoutes.js";
import premiumRoutes from "../modules/plans/premiumRoutes.js";
import jobRoutes from "./jobRoutes.js";

const router = express.Router();

router.use('/plan', planRoutes);
router.use('/user', userRoutes);
router.use('/auth', authRoutes);
router.use('/daily-log', dailyLogRoutes);
router.use('/weight', weightRoutes);
router.use('/progress', progressRoutes);
router.use('/ai', feedbackRoutes);
router.use("/dashboard", dashboardRoutes);
router.use("/contact", contactRoutes);
router.use("/superadmin", superadminRoutes);
router.use("/pantry", pantryRoutes);
router.use("/premium", premiumRoutes);
router.use("/jobs", jobRoutes);

export default router;