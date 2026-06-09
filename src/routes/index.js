import express from 'express';
import planRoutes from './planRoutes.js';
import userRoutes from './userRoutes.js';
import authRoutes from './authRoutes.js';
import dailyLogRoutes from "./dailyLogRoutes.js";
import weightRoutes  from "./weightRoutes.js";
import progressRoutes from "./progressRoutes.js";
import feedbackRoutes from "./feedbackRoutes.js";
import dashboardRoutes from "./dashboardRoutes.js";
import contactRoutes from "./contactRoutes.js";
import superadminRoutes from "./superadminRoutes.js";
import pantryRoutes from "./pantryRoutes.js";
import premiumRoutes from "./premiumRoutes.js";

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

export default router;