import express from 'express';
import planRoutes from './planRoutes.js';
import userRoutes from './userRoutes.js';
import authRoutes from './authRoutes.js';
import dailyLogRoutes from "./dailyLogRoutes.js";
import weightRoutes  from "./weightRoutes.js";
import progressRoutes from "./progressRoutes.js";
import feedbackRoutes from "./feedbackRoutes.js";

const router = express.Router();

router.use('/plan', planRoutes);
router.use('/user', userRoutes);
router.use('/auth', authRoutes);
router.use('/daily-log', dailyLogRoutes);
router.use('/weight', weightRoutes);
router.use('/progress', progressRoutes);
router.use('/ai', feedbackRoutes);


export default router;