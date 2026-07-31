export const QUEUE_NAME = "fitnova-jobs";

export const JOB_NAMES = {
  AI_PLAN_GENERATE: "ai-plan-generate",
  DAILY_REMINDER: "daily-reminder",
  WEEKLY_SUMMARY: "weekly-summary",
  STREAK_CALCULATE: "streak-calculate",
  DISPATCH_DAILY_REMINDERS: "dispatch-daily-reminders",
  DISPATCH_WEEKLY_SUMMARIES: "dispatch-weekly-summaries",
  DISPATCH_STREAK_RECALC: "dispatch-streak-recalc",
};

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 5_000,
  },
  removeOnComplete: {
    count: 200,
    age: 7 * 24 * 3600,
  },
  removeOnFail: {
    count: 500,
    age: 14 * 24 * 3600,
  },
};

export const AI_PLAN_JOB_OPTIONS = {
  ...DEFAULT_JOB_OPTIONS,
  attempts: 2,
  backoff: {
    type: "exponential",
    delay: 10_000,
  },
};
