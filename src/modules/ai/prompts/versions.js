export const PROMPT_VERSIONS = {
  PLAN: "plan.v2",
  COACHING: "coaching.v1",
  FEEDBACK: "feedback.v1",
};

/** Bump version when prompt structure or rules change materially. */
export const ACTIVE_PROMPT_VERSIONS = {
  plan: PROMPT_VERSIONS.PLAN,
  coaching: PROMPT_VERSIONS.COACHING,
  feedback: PROMPT_VERSIONS.FEEDBACK,
};
