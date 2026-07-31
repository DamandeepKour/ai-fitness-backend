import { Worker } from "bullmq";
import { logger } from "../config/logger.js";
import { createBullConnection, isQueueEnabled } from "./connection.js";
import { QUEUE_NAME } from "./constants.js";
import { PROCESSOR_MAP } from "./processors/index.js";

let worker = null;

export function startFitnovaWorker() {
  if (!isQueueEnabled()) {
    logger.warn({ type: "jobs" }, "REDIS_URL not set — FitNova job worker not started");
    return null;
  }

  if (worker) return worker;

  const connection = createBullConnection();

  worker = new Worker(
    QUEUE_NAME,
    async (job) => {
      const processor = PROCESSOR_MAP[job.name];
      if (!processor) {
        throw new Error(`No processor registered for job "${job.name}"`);
      }

      logger.info(
        {
          type: "jobs",
          jobId: job.id,
          name: job.name,
          attempt: job.attemptsMade + 1,
        },
        `Processing job ${job.name}`,
      );

      return processor(job);
    },
    {
      connection,
      concurrency: Number(process.env.JOB_CONCURRENCY || 5),
    },
  );

  worker.on("completed", (job, result) => {
    logger.info(
      {
        type: "jobs",
        jobId: job.id,
        name: job.name,
        attemptsMade: job.attemptsMade,
        resultStatus: result?.sent === false ? "skipped" : "ok",
      },
      `Job ${job.id} completed`,
    );
  });

  worker.on("failed", (job, err) => {
    logger.error(
      {
        type: "jobs",
        jobId: job?.id,
        name: job?.name,
        attemptsMade: job?.attemptsMade,
        attemptsMax: job?.opts?.attempts,
        err: err.message,
      },
      `Job ${job?.id} failed`,
    );
  });

  worker.on("error", (err) => {
    logger.error({ type: "jobs", err: err.message }, "FitNova worker error");
  });

  logger.info({ type: "jobs", queue: QUEUE_NAME }, "FitNova job worker started");
  return worker;
}

export function getFitnovaWorker() {
  return worker;
}

export async function stopFitnovaWorker() {
  if (!worker) return;
  await worker.close();
  worker = null;
}
