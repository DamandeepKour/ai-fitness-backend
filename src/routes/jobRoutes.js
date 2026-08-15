import express from "express";
import {
  getJobStatus,
  listJobs,
  retryJob,
  triggerDispatch,
} from "../Controllers/jobController.js";
import authMiddleware from "../modules/auth/authMiddleware.js";
import { requirePermission } from "../modules/auth/requireRole.js";
import { PERMISSIONS } from "../modules/auth/roles.js";

const router = express.Router();
const systemRead = requirePermission(PERMISSIONS.SYSTEM_READ);

router.use(authMiddleware);
router.get("/", systemRead, listJobs);
router.get("/:id", getJobStatus);
router.post("/:id/retry", systemRead, retryJob);
router.post("/dispatch/:type", systemRead, triggerDispatch);

export default router;
