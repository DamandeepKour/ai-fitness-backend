import { AI_FEATURES } from "../config.js";
import { runAiTask } from "../fitnovaAiService.js";
import { MEAL_EXPLANATION_FALLBACK } from "../fallbacks/index.js";
import { buildMealExplanationPrompt } from "../prompts/templates.js";
import { ACTIVE_PROMPT_VERSIONS } from "../prompts/versions.js";

/** "Why this meal" — explains a specific logged meal against the user's goal/calorie target. */
export async function generateMealExplanation(meal, context = {}, options = {}) {
  const { messages } = buildMealExplanationPrompt(meal, context);
  const promptVersion = ACTIVE_PROMPT_VERSIONS.explainMeal;

  const { data, meta } = await runAiTask({
    feature: AI_FEATURES.EXPLAIN_MEAL,
    promptVersion,
    messages,
    userId: options.userId ?? null,
    parseJson: false,
    fallback: () => MEAL_EXPLANATION_FALLBACK,
    metadata: {
      mealType: meal.meal_type ?? null,
      goal: context.goal ?? null,
    },
  });

  return {
    explanation: data,
    aiMeta: meta,
  };
}
