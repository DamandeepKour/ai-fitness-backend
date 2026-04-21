import express from 'express';
import planRoutes from './planRoutes.js';
import userRoutes from './userRoutes.js';

const router = express.Router();

router.use('/plan', planRoutes);
router.use('/user', userRoutes);


export default router;