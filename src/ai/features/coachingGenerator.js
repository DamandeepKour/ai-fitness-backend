import { AI_FEATURES } from "../config.js";
import { runAiTask } from "../fitnovaAiService.js";
import { buildCoachingFallback } from "../fallbacks/index.js";
import { buildCoachingPrompt } from "../prompts/templates.js";
import { ACTIVE_PROMPT_VERSIONS } from "../prompts/versions.js";

export async function generateCoaching({ user, weightData = [], pantry = [] }, options = {}) {
  const { messages, context } = buildCoachingPrompt({ user, weightData, pantry });
  const promptVersion = ACTIVE_PROMPT_VERSIONS.coaching;

  const { data, meta } = await runAiTask({
    feature: AI_FEATURES.COACHING,
    promptVersion,
    messages,
    userId: options.userId ?? null,
    parseJson: false,
    fallback: () => buildCoachingFallback(context.hindi),
    metadata: {
      language: context.language,
      pantryAware: context.pantryAware,
    },
  });

  return {
    coaching: data,
    language: context.hindi ? "hi-en" : "en-hi",
    pantryAware: context.pantryAware,
    aiMeta: meta,
  };
}
