import mongoose from "mongoose";

const aiAuditLogSchema = new mongoose.Schema(
  {
    requestId: { type: String, index: true, default: null },
    userId: { type: Number, index: true, default: null },
    feature: { type: String, required: true, index: true },
    promptVersion: { type: String, required: true },
    model: { type: String, default: null },
    status: { type: String, required: true, index: true },
    latencyMs: { type: Number, default: 0 },
    attempts: { type: Number, default: 1 },
    usedFallback: { type: Boolean, default: false },
    errorMessage: { type: String, default: null },
    promptTokens: { type: Number, default: null },
    completionTokens: { type: Number, default: null },
    route: { type: String, default: null },
    metadata: { type: mongoose.Schema.Types.Mixed, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: "ai_audit_logs",
    versionKey: false,
  },
);

aiAuditLogSchema.index({ createdAt: -1 });
aiAuditLogSchema.index({ feature: 1, status: 1, createdAt: -1 });

export const AiAuditLog =
  mongoose.models.AiAuditLog || mongoose.model("AiAuditLog", aiAuditLogSchema);

export default AiAuditLog;
