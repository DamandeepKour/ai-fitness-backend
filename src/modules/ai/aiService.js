/**
 * Backward-compatible entry point for plan generation.
 * Controllers and workers should import from @/ai or planService — not Groq directly.
 */
export { default } from "./features/planGenerator.js";
