import express from 'express';
import planRoutes from './planRoutes.js';
import userRoutes from './userRoutes.js';
import authRoutes from './authRoutes.js';

const router = express.Router();

router.use('/plan', planRoutes);
router.use('/user', userRoutes);
router.use('/auth', authRoutes);


export default router;