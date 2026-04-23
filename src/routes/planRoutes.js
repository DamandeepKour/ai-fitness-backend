import express from "express";
import { generatePlan } from "../Controllers/planController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/generate-plan",authMiddleware, generatePlan);

export default router;