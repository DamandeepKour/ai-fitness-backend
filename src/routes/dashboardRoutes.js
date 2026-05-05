// src/routes/dashboardRoutes.js

import express from "express";
import { getDashboard } from "../Controllers/dashboardController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/", authMiddleware, getDashboard);

export default router;