import PDFDocument from "pdfkit";

const SUMMARY_LABELS = {
  signups: "Signups",
  active_users: "Active Users",
  avg_daily_active_users: "Avg Daily Active Users",
  plan_generations: "Plan Generations",
  plan_generation_users: "Users Who Generated a Plan",
  meal_log_completion_rate_pct: "Meal Log Completion Rate (%)",
  ai_total_calls: "AI Calls (Total)",
  ai_success_calls: "AI Calls (Success)",
  ai_fallback_calls: "AI Calls (Fallback)",
  ai_error_calls: "AI Calls (Error)",
  ai_success_rate_pct: "AI Success Rate (%)",
  ai_fallback_rate_pct: "AI Fallback Rate (%)",
  ai_avg_latency_ms: "AI Avg Latency (ms)",
  retention_day7_pct: "Retention — Day 7 (%)",
  retention_day30_pct: "Retention — Day 30 (%)",
};

/** Renders an admin digest as a single-page PDF report. Returns a Buffer. */
export function renderDigestPdf(digest) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50 });
    const chunks = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const periodLabel = digest.period === "weekly" ? "Weekly" : "Daily";

    doc.fontSize(20).text(`FitNova Admin Digest — ${periodLabel}`, { align: "left" });
    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .fillColor("#555")
      .text(`Range: ${digest.summary.range_from} — ${digest.summary.range_to}`);
    doc.text(`Generated: ${digest.generatedAt} (source: ${digest.source})`);
    doc.fillColor("#000");
    doc.moveDown(1);

    doc.fontSize(14).text("Summary");
    doc.moveDown(0.3);
    doc.fontSize(11);
    for (const [key, label] of Object.entries(SUMMARY_LABELS)) {
      const value = digest.summary[key];
      doc.text(`${label}: ${value ?? "—"}`);
    }

    doc.moveDown(1);
    doc.fontSize(14).text("Goal Distribution");
    doc.moveDown(0.3);
    doc.fontSize(11);
    const goalRows = digest.goalDistribution?.distribution || [];
    if (!goalRows.length) {
      doc.text("No data for this period.");
    } else {
      for (const row of goalRows) {
        doc.text(`${row.goal}: ${row.count} (${row.percent}%)`);
      }
    }

    doc.moveDown(1);
    doc.fontSize(14).text("AI Usage by Feature");
    doc.moveDown(0.3);
    doc.fontSize(11);
    const aiRows = digest.aiByFeature || [];
    if (!aiRows.length) {
      doc.text("No AI calls for this period.");
    } else {
      for (const row of aiRows) {
        doc.text(
          `${row.feature}: ${row.count} calls — ${row.success} success / ${row.fallback} fallback / ${row.error} error — avg ${row.avgLatencyMs}ms`,
        );
      }
    }

    doc.end();
  });
}
