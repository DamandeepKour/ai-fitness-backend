import createPlanService from "../../services/planService.js";
import { AUDIT_ACTIONS, logAction } from "../../utils/auditLog.js";

export async function processAiPlanJob(job) {
  const { userId, data, requestId } = job.data || {};
  if (!userId || !data) {
    throw new Error("ai-plan-generate requires userId and data");
  }

  await job.updateProgress(10);

  try {
    const result = await createPlanService(userId, data);
    await job.updateProgress(90);

    logAction({
      action: AUDIT_ACTIONS.PLAN_GENERATION,
      status: "success",
      userId,
      meta: {
        jobId: job.id,
        requestId: requestId || null,
        goal: data.goal,
        async: true,
      },
    });

    await job.updateProgress(100);
    return {
      userId,
      planSaved: true,
      hasDietPlan: Boolean(result?.diet_plan),
      hasWorkoutPlan: Boolean(result?.workout_plan),
      calories: result?.calories ?? null,
      goal: result?.goal ?? data.goal ?? null,
    };
  } catch (err) {
    logAction({
      action: AUDIT_ACTIONS.PLAN_GENERATION,
      status: "error",
      userId,
      message: err.message,
      meta: { jobId: job.id, requestId: requestId || null, async: true },
    });
    throw err;
  }
}
