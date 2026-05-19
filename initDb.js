import db from "./src/config/db.js";
import { syncDailyLogTable } from "./src/models/dailyLogModel.js";
import { syncPlanTable } from "./src/models/planModel.js";
import { syncProgressTable } from "./src/models/progressModel.js";
import { syncUserHistoryTable } from "./src/models/userHistoryModel.js";
import { syncUserTable } from "./src/models/userModel.js";
import { syncWeightTable } from "./src/models/weightModel.js";
import { syncContactTable } from "./src/models/contactModel.js";

const syncSteps = [
  { name: "users", fn: syncUserTable },
  { name: "plans", fn: syncPlanTable },
  { name: "progress", fn: syncProgressTable },
  { name: "daily_logs", fn: syncDailyLogTable },
  { name: "weights", fn: syncWeightTable },
  { name: "user_history", fn: syncUserHistoryTable },
  { name: "contact_messages", fn: syncContactTable },
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

  console.log("✅ DB Synced");
}
