import { processAiPlanJob } from "./aiPlanProcessor.js";
import { sendDailyReminderForUser, listReminderCandidates } from "../../services/reminderJobService.js";
import {
  generateAndSendWeeklySummary,
  listWeeklySummaryRecipients,
} from "../../services/weeklySummaryService.js";
import { calculateAndSaveStreak } from "../../services/streakService.js";
import { listActiveUserIds } from "../../repositories/streakRepo.js";
import {
  enqueueDailyReminderJob,
  enqueueStreakJob,
  enqueueWeeklySummaryJob,
} from "../queues.js";
import { JOB_NAMES } from "../constants.js";

export async function processDailyReminderJob(job) {
  const { userId, asOfDate } = job.data || {};
  if (!userId) throw new Error("daily-reminder requires userId");
  await job.updateProgress(20);
  const result = await sendDailyReminderForUser(userId, { asOfDate });
  await job.updateProgress(100);
  return result;
}

export async function processWeeklySummaryJob(job) {
  const { userId, endDate } = job.data || {};
  if (!userId) throw new Error("weekly-summary requires userId");
  await job.updateProgress(20);
  const result = await generateAndSendWeeklySummary(userId, endDate);
  await job.updateProgress(100);
  return result;
}

export async function processStreakJob(job) {
  const { userId, asOfDate } = job.data || {};
  if (!userId) throw new Error("streak-calculate requires userId");
  await job.updateProgress(20);
  const result = await calculateAndSaveStreak(userId, asOfDate);
  await job.updateProgress(100);
  return result;
}

export async function processDispatchDailyReminders(job) {
  const candidates = await listReminderCandidates();
  await job.updateProgress(10);

  let enqueued = 0;
  for (const user of candidates) {
    await enqueueDailyReminderJob(
      { userId: user.id, asOfDate: job.data?.asOfDate },
      { jobId: `reminder:${user.id}:${job.data?.asOfDate || "today"}` },
    );
    enqueued += 1;
    if (candidates.length && enqueued % 25 === 0) {
      await job.updateProgress(Math.min(95, 10 + Math.round((enqueued / candidates.length) * 80)));
    }
  }

  await job.updateProgress(100);
  return { enqueued, candidates: candidates.length };
}

export async function processDispatchWeeklySummaries(job) {
  const recipients = await listWeeklySummaryRecipients();
  await job.updateProgress(10);

  let enqueued = 0;
  for (const user of recipients) {
    await enqueueWeeklySummaryJob(
      { userId: user.id, endDate: job.data?.endDate },
      { jobId: `weekly:${user.id}:${job.data?.endDate || "week"}` },
    );
    enqueued += 1;
  }

  await job.updateProgress(100);
  return { enqueued, recipients: recipients.length };
}

export async function processDispatchStreakRecalc(job) {
  const userIds = await listActiveUserIds();
  await job.updateProgress(10);

  let enqueued = 0;
  for (const userId of userIds) {
    await enqueueStreakJob(
      { userId, asOfDate: job.data?.asOfDate },
      { jobId: `streak:${userId}:${job.data?.asOfDate || "today"}` },
    );
    enqueued += 1;
  }

  await job.updateProgress(100);
  return { enqueued, users: userIds.length };
}

export const PROCESSOR_MAP = {
  [JOB_NAMES.AI_PLAN_GENERATE]: processAiPlanJob,
  [JOB_NAMES.DAILY_REMINDER]: processDailyReminderJob,
  [JOB_NAMES.WEEKLY_SUMMARY]: processWeeklySummaryJob,
  [JOB_NAMES.STREAK_CALCULATE]: processStreakJob,
  [JOB_NAMES.DISPATCH_DAILY_REMINDERS]: processDispatchDailyReminders,
  [JOB_NAMES.DISPATCH_WEEKLY_SUMMARIES]: processDispatchWeeklySummaries,
  [JOB_NAMES.DISPATCH_STREAK_RECALC]: processDispatchStreakRecalc,
};
