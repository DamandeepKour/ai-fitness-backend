import db from "./src/config/db.js";
import { syncDailyLogTable } from "./src/models/dailyLogModel.js";
import { syncPlanTable } from "./src/models/planModel.js";
import { syncProgressTable } from "./src/models/progressModel.js";
import { syncUserTable } from "./src/models/userModel.js";

export default async function initDb() {
  await db();

  await Promise.all([
    syncUserTable(),
    syncPlanTable(),
    syncProgressTable(),
    syncDailyLogTable(),
  ]);

  console.log("✅ DB Synced");
}