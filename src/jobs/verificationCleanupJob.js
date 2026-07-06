import cron from "node-cron";
import { deleteUnverifiedUsersOlderThanHours } from "../repositories/userRepository.js";

const CLEANUP_INTERVAL_HOURS = 24;

export function startVerificationCleanupJob() {
  cron.schedule("0 0 * * *", async () => {
    try {
      const deleted = await deleteUnverifiedUsersOlderThanHours(CLEANUP_INTERVAL_HOURS);
      if (deleted > 0) {
        console.log(`[cron] Deleted ${deleted} unverified user(s) older than ${CLEANUP_INTERVAL_HOURS}h`);
      }
    } catch (err) {
      console.error("[cron] Verification cleanup failed:", err.message);
    }
  });

  console.log("✅ Verification cleanup cron scheduled (daily at midnight)");
}
