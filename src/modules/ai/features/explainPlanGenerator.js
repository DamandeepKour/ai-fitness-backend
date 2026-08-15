import { AI_FEATURES } from "../config.js";
import { runAiTask } from "../fitnovaAiService.js";
import { PLAN_EXPLANATION_FALLBACK } from "../fallbacks/index.js";
import { buildPlanExplanationPrompt } from "../prompts/templates.js";
import { ACTIVE_PROMPT_VERSIONS } from "../prompts/versions.js";

/** "Why this plan" — explains the user's current diet + workout plan. */
export async function generatePlanExplanation(plan, context = {}, options = {}) {
  const { messages } = buildPlanExplanationPrompt(plan, context);
  const promptVersion = ACTIVE_PROMPT_VERSIONS.explainPlan;

  const { data, meta } = await runAiTask({
    feature: AI_FEATURES.EXPLAIN_PLAN,
    promptVersion,
    messages,
    userId: options.userId ?? null,
    parseJson: false,
    fallback: () => PLAN_EXPLANATION_FALLBACK,
    metadata: {
      goal: context.goal ?? null,
      dietType: context.diet_type ?? null,
    },
  });

  return {
    explanation: data,
    aiMeta: meta,
  };
}
