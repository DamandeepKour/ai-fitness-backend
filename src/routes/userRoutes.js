import express from "express";
import { createUser, getUsers, getUserById, updateUser, getUserHistory } from "../Controllers/userController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

router.post("/", createUser);
router.put("/update", authMiddleware, updateUser);
router.get("/all-user", authMiddleware,getUsers); 
router.get("/:id", authMiddleware, getUserById);
router.get("/history", authMiddleware, getUserHistory);

export default router;