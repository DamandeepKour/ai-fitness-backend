import cron from "node-cron";
import { logger } from "../config/logger.js";
import { isQueueEnabled } from "./connection.js";
import { JOB_NAMES } from "./constants.js";
import { enqueueDispatchJob } from "./queues.js";
import { serverCalendarYmd } from "../utils/localDate.js";

let started = false;

/**
 * Cron schedules enqueue BullMQ dispatch jobs (so status/retries stay visible).
 * Override with env if needed:
 *   CRON_DAILY_REMINDERS, CRON_WEEKLY_SUMMARY, CRON_STREAK_RECALC
 */
export function startJobSchedulers() {
  if (started) return;
  started = true;

  if (!isQueueEnabled()) {
    logger.warn({ type: "jobs" }, "REDIS_URL not set — job schedulers not started");
    return;
  }

  const dailyRemindersCron = process.env.CRON_DAILY_REMINDERS || "0 9 * * *";
  const weeklySummaryCron = process.env.CRON_WEEKLY_SUMMARY || "0 10 * * 1";
  const streakCron = process.env.CRON_STREAK_RECALC || "15 0 * * *";

  cron.schedule(dailyRemindersCron, async () => {
    try {
      const job = await enqueueDispatchJob(JOB_NAMES.DISPATCH_DAILY_REMINDERS, {
        asOfDate: serverCalendarYmd(),
        triggeredBy: "cron",
      });
      logger.info(
        { type: "jobs", jobId: job.id, name: JOB_NAMES.DISPATCH_DAILY_REMINDERS },
        "Enqueued daily reminders dispatch",
      );
    } catch (err) {
      logger.error({ type: "jobs", err: err.message }, "Failed to enqueue daily reminders");
    }
  });

  cron.schedule(weeklySummaryCron, async () => {
    try {
      const job = await enqueueDispatchJob(JOB_NAMES.DISPATCH_WEEKLY_SUMMARIES, {
        endDate: serverCalendarYmd(),
        triggeredBy: "cron",
      });
      logger.info(
        { type: "jobs", jobId: job.id, name: JOB_NAMES.DISPATCH_WEEKLY_SUMMARIES },
        "Enqueued weekly summaries dispatch",
      );
    } catch (err) {
      logger.error({ type: "jobs", err: err.message }, "Failed to enqueue weekly summaries");
    }
  });

  cron.schedule(streakCron, async () => {
    try {
      const job = await enqueueDispatchJob(JOB_NAMES.DISPATCH_STREAK_RECALC, {
        asOfDate: serverCalendarYmd(),
        triggeredBy: "cron",
      });
      logger.info(
        { type: "jobs", jobId: job.id, name: JOB_NAMES.DISPATCH_STREAK_RECALC },
        "Enqueued streak recalculation dispatch",
      );
    } catch (err) {
      logger.error({ type: "jobs", err: err.message }, "Failed to enqueue streak recalc");
    }
  });

  logger.info(
    {
      type: "jobs",
      dailyRemindersCron,
      weeklySummaryCron,
      streakCron,
    },
    "FitNova job schedulers started",
  );
}
