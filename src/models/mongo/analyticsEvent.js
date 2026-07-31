import mongoose from "mongoose";

export const ANALYTICS_EVENT_TYPES = {
  SIGNUP: "signup",
  LOGIN: "login",
  MEAL_LOG_CREATE: "meal_log_create",
  PLAN_GENERATION: "plan_generation",
  DIET_PLAN_GENERATION: "diet_plan_generation",
  WORKOUT_PLAN_GENERATION: "workout_plan_generation",
  USER_ACTIVITY: "user_activity",
  ADMIN_ACTION: "admin_action",
};

const analyticsEventSchema = new mongoose.Schema(
  {
    eventType: { type: String, required: true, index: true },
    userId: { type: Number, index: true, default: null },
    day: { type: String, required: true, index: true }, // YYYY-MM-DD UTC
    goal: { type: String, default: null, index: true },
    status: { type: String, default: "success", index: true },
    requestId: { type: String, default: null },
    route: { type: String, default: null },
    latencyMs: { type: Number, default: null },
    meta: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "analytics_events",
    versionKey: false,
  },
);

analyticsEventSchema.index({ eventType: 1, createdAt: -1 });
analyticsEventSchema.index({ day: 1, eventType: 1 });
analyticsEventSchema.index({ userId: 1, day: 1, eventType: 1 });
analyticsEventSchema.index({ goal: 1, createdAt: -1 });

export const AnalyticsEvent =
  mongoose.models.AnalyticsEvent
  || mongoose.model("AnalyticsEvent", analyticsEventSchema);

export default AnalyticsEvent;
