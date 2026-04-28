import express from "express";
import { addWeight } from "../Controllers/weightController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/add", authMiddleware, addWeight);

export default router;