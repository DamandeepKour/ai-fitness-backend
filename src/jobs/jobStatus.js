import { QUEUE_NAME } from "./constants.js";

/**
 * Normalize a BullMQ job into an API-friendly status payload
 * with retry / failure visibility.
 */
export async function formatJobStatus(job) {
  if (!job) return null;

  const state = await job.getState();
  const attemptsMax = job.opts?.attempts ?? null;

  return {
    id: String(job.id),
    name: job.name,
    queue: QUEUE_NAME,
    state,
    progress: job.progress ?? 0,
    attemptsMade: job.attemptsMade ?? 0,
    attemptsMax,
    retriesRemaining:
      attemptsMax != null
        ? Math.max(0, attemptsMax - (job.attemptsMade ?? 0))
        : null,
    failedReason: job.failedReason || null,
    data: sanitizeJobData(job.data),
    result: job.returnvalue ?? null,
    delay: job.delay || 0,
    timestamp: job.timestamp || null,
    processedOn: job.processedOn || null,
    finishedOn: job.finishedOn || null,
  };
}

function sanitizeJobData(data) {
  if (!data || typeof data !== "object") return data ?? null;
  const clone = { ...data };
  if (clone.data && typeof clone.data === "object") {
    const body = { ...clone.data };
    delete body.password;
    delete body.token;
    clone.data = body;
  }
  return clone;
}

export async function listRecentJobs(queue, {
  states = ["active", "waiting", "delayed", "completed", "failed"],
  start = 0,
  end = 49,
} = {}) {
  const jobs = await queue.getJobs(states, start, end, false);
  const formatted = await Promise.all(jobs.map((job) => formatJobStatus(job)));
  return formatted;
}
