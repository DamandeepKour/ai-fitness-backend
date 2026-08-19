import { Queue } from "bullmq";
import { getBullConnection, isQueueEnabled } from "./connection.js";
import {
  AI_PLAN_JOB_OPTIONS,
  DEFAULT_JOB_OPTIONS,
  JOB_NAMES,
  QUEUE_NAME,
} from "./constants.js";
import { upsertJobStatus } from "./jobStatusModel.js";
import { logger } from "../config/logger.js";

let fitnovaQueue = null;

export function getFitnovaQueue() {
  if (!isQueueEnabled()) {
    const err = new Error("Job queue unavailable — REDIS_URL is not configured");
    err.statusCode = 503;
    err.code = "QUEUE_UNAVAILABLE";
    throw err;
  }

  if (!fitnovaQueue) {
    fitnovaQueue = new Queue(QUEUE_NAME, {
      connection: getBullConnection(),
      defaultJobOptions: DEFAULT_JOB_OPTIONS,
    });
  }

  return fitnovaQueue;
}

/** @deprecated Use getFitnovaQueue — kept for older imports */
export function getAiQueue() {
  return getFitnovaQueue();
}

export async function enqueueAiPlanJob({ userId, data, requestId = null }) {
  return addJobSafe(
    JOB_NAMES.AI_PLAN_GENERATE,
    { userId, data, requestId },
    {
      ...AI_PLAN_JOB_OPTIONS,
      jobId: requestId ? `ai-plan:${requestId}` : undefined,
    },
  );
}

export async function enqueueDailyReminderJob(payload, options = {}) {
  return addJobSafe(JOB_NAMES.DAILY_REMINDER, payload, {
    ...DEFAULT_JOB_OPTIONS,
    ...options,
  });
}

export async function enqueueWeeklySummaryJob(payload, options = {}) {
  return addJobSafe(JOB_NAMES.WEEKLY_SUMMARY, payload, {
    ...DEFAULT_JOB_OPTIONS,
    ...options,
  });
}

export async function enqueueStreakJob(payload, options = {}) {
  return addJobSafe(JOB_NAMES.STREAK_CALCULATE, payload, {
    ...DEFAULT_JOB_OPTIONS,
    attempts: 2,
    ...options,
  });
}

export async function enqueueDispatchJob(jobName, payload = {}, options = {}) {
  return addJobSafe(jobName, payload, {
    ...DEFAULT_JOB_OPTIONS,
    ...options,
  });
}

async function addJobSafe(name, payload, options) {
  const queue = getFitnovaQueue();
  let job;
  try {
    job = await queue.add(name, payload, options);
  } catch (err) {
    // Idempotent jobId collisions are expected on re-dispatch.
    if (options.jobId && /already exists|Job.*?exist/i.test(String(err.message || ""))) {
      const existing = await queue.getJob(options.jobId);
      if (existing) return existing;
    }
    throw err;
  }

  // Best-effort durable record — must never block/fail job dispatch.
  void upsertJobStatus({
    jobId: String(job.id),
    jobName: name,
    queueName: QUEUE_NAME,
    status: "queued",
    attemptsMade: 0,
    attemptsMax: options.attempts ?? null,
  }).catch((err) => {
    logger.error({ type: "jobs", jobId: job.id, err: err.message }, "Job status DB write failed (queued)");
  });

  return job;
}
