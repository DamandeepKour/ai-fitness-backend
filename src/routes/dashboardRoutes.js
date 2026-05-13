// src/routes/dashboardRoutes.js

import express from "express";
import { getDashboard } from "../Controllers/dashboardController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/show", authMiddleware, getDashboard);

export default router;