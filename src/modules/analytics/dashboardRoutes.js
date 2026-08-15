// src/routes/dashboardRoutes.js

import express from "express";
import { getDashboard } from "./dashboardController.js";
import authMiddleware from "../auth/authMiddleware.js";

const router = express.Router();

router.get("/show", authMiddleware, getDashboard);

export default router;