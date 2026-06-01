import db from "../config/db.js";
import { couponsTable, subscriptionsTable } from "../models/businessModel.js";

function pct(n, d) {
  if (!d) return 0;
  return Math.round((n / d) * 100);
}

export async function getBusinessAnalyticsService() {
  const conn = await db();

  const [[signupRow]] = await conn.query(
    `SELECT COUNT(*) AS total FROM users WHERE user_type = 'user' OR user_type IS NULL`,
  );
  const signups = Number(signupRow.total || 0);

  const [[paidRow]] = await conn.query(
    `SELECT COUNT(DISTINCT user_id) AS total
     FROM ${subscriptionsTable}
     WHERE status = 'active'`,
  );
  const paid = Number(paidRow.total || 0);
  const conversion = pct(paid, signups);

  const [[retention7]] = await conn.query(
    `SELECT
      COUNT(*) AS cohortSize,
      SUM(
        CASE
          WHEN last_updated_at IS NOT NULL
           AND last_updated_at >= created_at
           AND last_updated_at <= DATE_ADD(created_at, INTERVAL 7 DAY)
          THEN 1 ELSE 0
        END
      ) AS retained
     FROM users
     WHERE (user_type = 'user' OR user_type IS NULL)
       AND created_at <= DATE_SUB(NOW(), INTERVAL 7 DAY)
       AND created_at >= DATE_SUB(NOW(), INTERVAL 37 DAY)`,
  );

  const [[retention30]] = await conn.query(
    `SELECT
      COUNT(*) AS cohortSize,
      SUM(
        CASE
          WHEN last_updated_at IS NOT NULL
           AND last_updated_at >= DATE_ADD(created_at, INTERVAL 23 DAY)
          THEN 1 ELSE 0
        END
      ) AS retained
     FROM users
     WHERE (user_type = 'user' OR user_type IS NULL)
       AND created_at <= DATE_SUB(NOW(), INTERVAL 30 DAY)
       AND created_at >= DATE_SUB(NOW(), INTERVAL 60 DAY)`,
  );

  const r7 = pct(Number(retention7.retained || 0), Number(retention7.cohortSize || 0));
  const r30 = pct(Number(retention30.retained || 0), Number(retention30.cohortSize || 0));

  const [churnRows] = await conn.query(
    `SELECT cancel_reason AS label, COUNT(*) AS count
     FROM ${subscriptionsTable}
     WHERE status = 'cancelled' AND cancel_reason IS NOT NULL
     GROUP BY cancel_reason
     ORDER BY count DESC`,
  );
  const churnReasons = churnRows.map((row) => ({
    label: row.label,
    count: Number(row.count || 0),
  }));
  const churnTotal = churnReasons.reduce((a, r) => a + r.count, 0);

  const [[monthlyChurnRow]] = await conn.query(
    `SELECT
      SUM(CASE WHEN status = 'cancelled' AND cancelled_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END) AS cancelled,
      SUM(CASE WHEN created_at < DATE_SUB(NOW(), INTERVAL 30 DAY) AND status IN ('active','cancelled') THEN 1 ELSE 0 END) AS base
     FROM ${subscriptionsTable}`,
  );
  const monthlyChurn = pct(
    Number(monthlyChurnRow.cancelled || 0),
    Number(monthlyChurnRow.base || 0),
  );

  const [packageRows] = await conn.query(
    `SELECT package_label AS label, COUNT(*) AS count
     FROM ${subscriptionsTable}
     WHERE status IN ('active','cancelled')
     GROUP BY package_label
     ORDER BY count DESC`,
  );
  const packages = packageRows.map((row) => ({
    label: row.label,
    count: Number(row.count || 0),
  }));
  const pkgTotal = packages.reduce((a, r) => a + r.count, 0);

  const [couponRows] = await conn.query(
    `SELECT
      c.code,
      COUNT(s.id) AS redemptions,
      COALESCE(SUM(s.package_price), 0) AS revenue
     FROM ${couponsTable} c
     LEFT JOIN ${subscriptionsTable} s ON s.coupon_code = c.code
     GROUP BY c.id, c.code
     ORDER BY redemptions DESC`,
  );
  const coupons = couponRows.map((row) => ({
    code: row.code,
    redemptions: Number(row.redemptions || 0),
    revenue: Number(row.revenue || 0),
  }));

  const [[revenueRow]] = await conn.query(
    `SELECT
      COALESCE(SUM(CASE WHEN status = 'active' THEN package_price ELSE 0 END), 0) AS mrr,
      COALESCE(SUM(CASE WHEN status = 'refunded' AND cancelled_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN package_price ELSE 0 END), 0) AS refunds,
      COUNT(DISTINCT CASE WHEN status = 'active' THEN user_id END) AS activePaidUsers
     FROM ${subscriptionsTable}
     WHERE created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) OR status = 'active'`,
  );

  const mrr = Number(revenueRow.mrr || 0);
  const activePaidUsers = Number(revenueRow.activePaidUsers || 0);
  const arpu = activePaidUsers ? mrr / activePaidUsers : 0;
  const ltv = arpu * 7.8;

  return {
    signups,
    paid,
    conversion,
    retentionDay7: r7,
    retentionDay30: r30,
    monthlyChurn,
    churnTotal,
    churnReasons,
    packages,
    pkgTotal,
    coupons,
    revenue: {
      mrr,
      arpu,
      ltv,
      refunds: Number(revenueRow.refunds || 0),
    },
  };
}
