// src/controllers/jobController.js

import { aiQueue } from "../jobs/queue.js";

export const getJobStatus = async (req, res) => {
  const job = await aiQueue.getJob(req.params.id);

  if (!job) {
    return res.status(404).json({ message: "Job not found" });
  }

  const state = await job.getState();

  res.json({
    success: true,
    state,
    result: job.returnvalue || null,
  });
};