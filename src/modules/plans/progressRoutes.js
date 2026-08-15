import express from "express";
import { getWeeklyProgress } from "./progressController.js";
import authMiddleware from "../auth/authMiddleware.js";

const router = express.Router();

router.get('/weekly', authMiddleware, getWeeklyProgress);

export default router;
