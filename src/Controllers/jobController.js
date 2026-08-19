import { getFitnovaQueue, enqueueDispatchJob, enqueueAiPlanJob } from "../jobs/queues.js";
import { formatJobStatus, listRecentJobs } from "../jobs/jobStatus.js";
import { getJobStatusByJobId } from "../jobs/jobStatusModel.js";
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

function fromDbRow(row) {
  return {
    id: row.job_id,
    name: row.job_name,
    queue: row.queue_name,
    state: row.status,
    progress: null,
    attemptsMade: row.attempts_made,
    attemptsMax: row.attempts_max,
    retriesRemaining:
      row.attempts_max != null ? Math.max(0, row.attempts_max - row.attempts_made) : null,
    failedReason: row.error_message,
    data: null,
    result: row.result_summary
      ? (typeof row.result_summary === "string" ? JSON.parse(row.result_summary) : row.result_summary)
      : null,
    delay: 0,
    timestamp: null,
    processedOn: null,
    finishedOn: null,
    source: "db", // this job has rotated out of Redis; served from durable history
  };
}

export const getJobStatus = asyncHandler(async (req, res) => {
  assertQueue();
  const job = await getFitnovaQueue().getJob(req.params.id);

  if (!job) {
    // BullMQ rotates completed/failed jobs out of Redis (see removeOnComplete/
    // removeOnFail in constants.js) — fall back to the durable DB record.
    const dbRow = await getJobStatusByJobId(req.params.id);
    if (!dbRow) {
      throw new AppError("Job not found", 404, null, "JOB_NOT_FOUND");
    }
    return res.json({ success: true, data: fromDbRow(dbRow) });
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
