import db from "./src/config/db.js";
import { syncDailyLogTable } from "./src/modules/meals/dailyLogModel.js";
import { syncPlanTable } from "./src/modules/plans/planModel.js";
import { syncProgressTable } from "./src/modules/plans/progressModel.js";
import { syncUserHistoryTable } from "./src/modules/users/userHistoryModel.js";
import { syncUserTable } from "./src/modules/users/userModel.js";
import { syncWeightTable } from "./src/modules/plans/weightModel.js";
import { syncContactTable } from "./src/modules/admin/contactModel.js";
import { syncBusinessTables, seedBusinessDemoData } from "./src/modules/admin/businessModel.js";
import { syncPantryTable } from "./src/modules/meals/pantryModel.js";
import { syncPremiumTables } from "./src/modules/plans/premiumModel.js";
import { syncLoginTokenTable } from "./src/modules/auth/loginTokenModel.js";
import { syncSignupVerificationTable } from "./src/modules/auth/signupVerificationModel.js";
import { syncTrafficLogTable } from "./src/modules/analytics/trafficLogModel.js";
import { syncAiRequestLogTable } from "./src/modules/ai/metadata/aiRequestLogModel.js";
import { syncUserStreakTable } from "./src/modules/users/userStreakModel.js";
import { syncJobStatusTable } from "./src/jobs/jobStatusModel.js";

const syncSteps = [
  { name: "users", fn: syncUserTable },
  { name: "plans", fn: syncPlanTable },
  { name: "progress", fn: syncProgressTable },
  { name: "daily_logs", fn: syncDailyLogTable },
  { name: "weights", fn: syncWeightTable },
  { name: "user_history", fn: syncUserHistoryTable },
  { name: "contact_messages", fn: syncContactTable },
  { name: "business", fn: syncBusinessTables },
  { name: "pantry_items", fn: syncPantryTable },
  { name: "premium", fn: syncPremiumTables },
  { name: "login_tokens", fn: syncLoginTokenTable },
  { name: "signup_verifications", fn: syncSignupVerificationTable },
  { name: "api_request_logs", fn: syncTrafficLogTable },
  { name: "ai_request_logs", fn: syncAiRequestLogTable },
  { name: "user_streaks", fn: syncUserStreakTable },
  { name: "job_status", fn: syncJobStatusTable },
];

export default async function initDb() {
  await db();

  // Run one at a time — avoids timeouts on small/free MySQL instances.
  for (const { name, fn } of syncSteps) {
    try {
      await fn();
      console.log(`✅ Table synced: ${name}`);
    } catch (err) {
      console.error(`❌ Failed syncing table "${name}":`, err.message);
      throw err;
    }
  }

  await seedBusinessDemoData();
  console.log("✅ DB Synced");
}
