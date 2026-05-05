// src/controllers/aiController.js

import { aiQueue } from "../jobs/queue.js";

export const generatePlanAsync = async (req, res) => {
  const job = await aiQueue.add("generate", {
    data: req.body,
  });

  res.json({
    success: true,
    jobId: job.id,
    message: "Plan is being generated",
  });
};