import { getFitnovaQueue, enqueueDispatchJob, enqueueAiPlanJob } from "../jobs/queues.js";
import { formatJobStatus, listRecentJobs } from "../jobs/jobStatus.js";
import { JOB_NAMES } from "../jobs/constants.js";
import { isQueueEnabled } from "../jobs/connection.js";
import { asyncHandler } from "../middleware/asyncHandler.js";
import { AppError } from "../utils/AppError.js";
import { serverCalendarYmd } from "../utils/localDate.js";

function assertQueue() {
  if (!isQueueEnabled()) {
    throw new AppError("Job queue unavailable — REDIS_URL is not configured", 503, null, "QUEUE_UNAVAILABLE");
  }
}

export const getJobStatus = asyncHandler(async (req, res) => {
  assertQueue();
  const job = await getFitnovaQueue().getJob(req.params.id);

  if (!job) {
    throw new AppError("Job not found", 404, null, "JOB_NOT_FOUND");
  }

  const status = await formatJobStatus(job);
  res.json({ success: true, data: status });
});

export const listJobs = asyncHandler(async (req, res) => {
  assertQueue();
  const states = req.query.state
    ? String(req.query.state).split(",").map((s) => s.trim()).filter(Boolean)
    : ["active", "waiting", "delayed", "completed", "failed"];
  const start = Math.max(0, Number(req.query.start) || 0);
  const end = Math.min(start + 49, start + (Number(req.query.limit) || 50) - 1);

  const jobs = await listRecentJobs(getFitnovaQueue(), { states, start, end });
  const counts = await getFitnovaQueue().getJobCounts(
    "waiting",
    "active",
    "completed",
    "failed",
    "delayed",
    "paused",
  );

  res.json({
    success: true,
    data: {
      counts,
      jobs,
    },
  });
});

export const retryJob = asyncHandler(async (req, res) => {
  assertQueue();
  const job = await getFitnovaQueue().getJob(req.params.id);
  if (!job) {
    throw new AppError("Job not found", 404, null, "JOB_NOT_FOUND");
  }

  const state = await job.getState();
  if (state !== "failed") {
    throw new AppError(`Only failed jobs can be retried (current state: ${state})`, 400);
  }

  await job.retry();
  const status = await formatJobStatus(job);

  res.json({
    success: true,
    message: "Job queued for retry",
    data: status,
  });
});

export const triggerDispatch = asyncHandler(async (req, res) => {
  assertQueue();
  const type = req.params.type;
  const map = {
    reminders: JOB_NAMES.DISPATCH_DAILY_REMINDERS,
    "weekly-summaries": JOB_NAMES.DISPATCH_WEEKLY_SUMMARIES,
    streaks: JOB_NAMES.DISPATCH_STREAK_RECALC,
  };

  const jobName = map[type];
  if (!jobName) {
    throw new AppError(`Unknown dispatch type: ${type}`, 404);
  }

  const payload = {
    triggeredBy: "api",
    actorId: req.user?.id ?? null,
    asOfDate: req.body?.asOfDate || req.query?.asOfDate || serverCalendarYmd(),
    endDate: req.body?.endDate || req.query?.endDate || serverCalendarYmd(),
  };

  const job = await enqueueDispatchJob(jobName, payload);
  const status = await formatJobStatus(job);

  res.status(202).json({
    success: true,
    message: `Dispatch job ${jobName} queued`,
    data: status,
  });
});

export { enqueueAiPlanJob };
