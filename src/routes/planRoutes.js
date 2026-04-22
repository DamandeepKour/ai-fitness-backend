import express from "express";
import { generatePlan } from "../Controllers/planController.js";

const router = express.Router();

router.post("/generate-plan", generatePlan);

export default router;