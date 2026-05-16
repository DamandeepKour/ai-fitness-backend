// src/controllers/aiController.js

import { getAiQueue } from "../jobs/queue.js";

export const generatePlanAsync = async (req, res) => {
  const job = await getAiQueue().add("generate", {
    data: req.body,
  });

  res.json({
    success: true,
    jobId: job.id,
    message: "Plan is being generated",
  });
};