import { AI_FEATURES } from "../config.js";
import { runAiTask } from "../fitnovaAiService.js";
import { buildPlanFallback } from "../fallbacks/index.js";
import { buildPlanPrompt } from "../prompts/templates.js";
import { ACTIVE_PROMPT_VERSIONS } from "../prompts/versions.js";
import { normalizePlanResponse } from "../utils/planNormalizers.js";

export async function generatePlan(data, options = {}) {
  const { messages, context } = buildPlanPrompt(data);
  const promptVersion = ACTIVE_PROMPT_VERSIONS.plan;

  const { data: parsed, meta } = await runAiTask({
    feature: AI_FEATURES.PLAN,
    promptVersion,
    messages,
    userId: options.userId ?? null,
    responseFormat: { type: "json_object" },
    parseJson: true,
    fallback: () => buildPlanFallback(context),
    metadata: {
      planType: data.plan_type || "weekly",
      goal: data.goal,
      workoutType: data.workout_type || "home",
    },
  });

  const plan = normalizePlanResponse(parsed, context);

  return {
    ...plan,
    aiMeta: meta,
  };
}

export default generatePlan;
