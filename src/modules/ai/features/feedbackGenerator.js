import { AI_FEATURES } from "../config.js";
import { runAiTask } from "../fitnovaAiService.js";
import { FEEDBACK_FALLBACK } from "../fallbacks/index.js";
import { buildFeedbackPrompt } from "../prompts/templates.js";
import { ACTIVE_PROMPT_VERSIONS } from "../prompts/versions.js";

export async function generateFeedback(weightData = [], options = {}) {
  const { messages } = buildFeedbackPrompt(weightData);
  const promptVersion = ACTIVE_PROMPT_VERSIONS.feedback;

  const { data, meta } = await runAiTask({
    feature: AI_FEATURES.FEEDBACK,
    promptVersion,
    messages,
    userId: options.userId ?? null,
    parseJson: false,
    fallback: () => FEEDBACK_FALLBACK,
    metadata: {
      weightEntries: Array.isArray(weightData) ? weightData.length : 0,
    },
  });

  return {
    feedback: data,
    aiMeta: meta,
  };
}
