import express from "express";
import { addWeight } from "./weightController.js";
import authMiddleware from "../auth/authMiddleware.js";

const router = express.Router();

router.post("/add", authMiddleware, addWeight);

export default router;