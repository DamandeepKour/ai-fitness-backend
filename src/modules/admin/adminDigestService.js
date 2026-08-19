import { getFitnovaAnalyticsOverviewService } from "../analytics/fitnovaAnalyticsService.js";
import { getRetentionAnalyticsService } from "../analytics/analyticsService.js";

const PERIOD_DAYS = { daily: 1, weekly: 7 };

function pct(numerator, denominator) {
  if (!denominator) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

/**
 * Admin-facing daily/weekly digest — reuses the existing overview + retention
 * aggregations rather than re-querying, so it stays consistent with the
 * individual /analytics/* endpoints.
 */
export async function getAdminDigestService(period = "daily") {
  const days = PERIOD_DAYS[period] || PERIOD_DAYS.daily;

  const [overview, retention] = await Promise.all([
    getFitnovaAnalyticsOverviewService({ days }),
    getRetentionAnalyticsService(),
  ]);

  const ai = overview.aiUsage;

  const summary = {
    period,
    range_from: overview.range.from,
    range_to: overview.range.to,
    signups: overview.newSignups.total,
    active_users: overview.dailyActiveUsers.uniqueActiveUsers,
    avg_daily_active_users: overview.dailyActiveUsers.averageDailyActiveUsers,
    plan_generations: overview.planGenerations.total,
    plan_generation_users: overview.planGenerations.uniqueUsers,
    meal_log_completion_rate_pct: overview.mealLogCompletion.rate,
    ai_total_calls: ai.totalCalls,
    ai_success_calls: ai.successCalls,
    ai_fallback_calls: ai.fallbackCalls,
    ai_error_calls: ai.errorCalls,
    ai_success_rate_pct: pct(ai.successCalls, ai.totalCalls),
    ai_fallback_rate_pct: pct(ai.fallbackCalls, ai.totalCalls),
    ai_avg_latency_ms: ai.avgLatencyMs,
    retention_day7_pct: retention.day7,
    retention_day30_pct: retention.day30,
  };

  return {
    period,
    generatedAt: overview.range.to,
    source: overview.source,
    summary,
    goalDistribution: overview.goalDistribution,
    aiByFeature: ai.byFeature,
  };
}
