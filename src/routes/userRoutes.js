import express from "express";
import { createUser, getUsers, getUserById, updateUser, getUserHistory, getCurrentUser } from "../Controllers/userController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", createUser);
router.put("/update", authMiddleware, updateUser);
router.get("/all-user", authMiddleware,getUsers); 
router.get("/me", authMiddleware, getCurrentUser);
router.get("/history/me", authMiddleware, getUserHistory);
router.get("/:id", authMiddleware, getUserById);

export default router;