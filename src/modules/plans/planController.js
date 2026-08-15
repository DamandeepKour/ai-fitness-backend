import createPlanService from "./planService.js";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { AUDIT_ACTIONS, logAction } from "../../utils/auditLog.js";
import { enqueueAiPlanJob } from "../../jobs/queues.js";
import { formatJobStatus } from "../../jobs/jobStatus.js";
import { AppError } from "../../utils/AppError.js";
import { isQueueEnabled } from "../../jobs/connection.js";

export const generatePlan = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const startedAt = Date.now();

  try {
    const result = await createPlanService(userId, req.body);
    const latencyMs = Date.now() - startedAt;
    const common = {
      req,
      userId,
      latencyMs,
      meta: {
        planType: req.body?.plan_type || "weekly",
        goal: req.body?.goal,
        workoutType: req.body?.workout_type || "home",
        hasDietPlan: Boolean(result?.diet_plan),
        hasWorkoutPlan: Boolean(result?.workout_plan),
      },
    };

    logAction({
      action: AUDIT_ACTIONS.DIET_PLAN_GENERATION,
      status: "success",
      ...common,
    });
    logAction({
      action: AUDIT_ACTIONS.WORKOUT_PLAN_GENERATION,
      status: "success",
      ...common,
    });
    logAction({
      action: AUDIT_ACTIONS.PLAN_GENERATION,
      status: "success",
      ...common,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    const latencyMs = Date.now() - startedAt;
    const common = {
      req,
      userId,
      latencyMs,
      message: err.message,
      meta: {
        planType: req.body?.plan_type || "weekly",
        goal: req.body?.goal,
      },
    };

    logAction({
      action: AUDIT_ACTIONS.DIET_PLAN_GENERATION,
      status: "error",
      ...common,
    });
    logAction({
      action: AUDIT_ACTIONS.WORKOUT_PLAN_GENERATION,
      status: "error",
      ...common,
    });

    throw err;
  }
});

/** Heavy AI plan generation via BullMQ — poll GET /api/jobs/:id for status. */
export const generatePlanAsync = asyncHandler(async (req, res) => {
  if (!isQueueEnabled()) {
    throw new AppError(
      "Async plan generation unavailable — REDIS_URL is not configured",
      503,
      null,
      "QUEUE_UNAVAILABLE",
    );
  }

  const userId = req.user.id;
  const job = await enqueueAiPlanJob({
    userId,
    data: req.body,
    requestId: req.requestId || null,
  });

  const status = await formatJobStatus(job);

  res.status(202).json({
    success: true,
    message: "Plan generation queued",
    data: {
      jobId: String(job.id),
      status,
    },
  });
});
