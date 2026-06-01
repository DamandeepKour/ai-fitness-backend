import db from "../config/db.js";

export const couponsTable = "coupons";
export const subscriptionsTable = "user_subscriptions";

export const couponColumns = {
  id: "INT AUTO_INCREMENT PRIMARY KEY",
  code: "VARCHAR(50) UNIQUE NOT NULL",
  discount_percent: "INT DEFAULT 0",
  is_active: "TINYINT(1) DEFAULT 1",
  created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
};

export const subscriptionColumns = {
  id: "INT AUTO_INCREMENT PRIMARY KEY",
  user_id: "INT NOT NULL",
  package_label: "VARCHAR(100) NOT NULL",
  package_price: "DECIMAL(10,2) NOT NULL",
  coupon_code: "VARCHAR(50) NULL",
  status: "ENUM('active','cancelled','refunded') DEFAULT 'active'",
  cancel_reason: "VARCHAR(100) NULL",
  created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
  cancelled_at: "TIMESTAMP NULL DEFAULT NULL",
};

async function syncTable(tableName, columns) {
  const conn = await db();
  const cols = Object.entries(columns)
    .map(([k, v]) => `${k} ${v}`)
    .join(", ");
  await conn.query(`CREATE TABLE IF NOT EXISTS ${tableName} (${cols})`);

  const [existing] = await conn.query(`SHOW COLUMNS FROM ${tableName}`);
  const existingCols = existing.map((c) => c.Field);
  for (const col in columns) {
    if (!existingCols.includes(col)) {
      await conn.query(`ALTER TABLE ${tableName} ADD COLUMN ${col} ${columns[col]}`);
    }
  }
}

export async function syncBusinessTables() {
  await syncTable(couponsTable, couponColumns);
  await syncTable(subscriptionsTable, subscriptionColumns);
}

export async function seedBusinessDemoData() {
  const conn = await db();
  const [[couponCount]] = await conn.query(`SELECT COUNT(*) AS total FROM ${couponsTable}`);
  if (Number(couponCount.total) > 0) return;

  const coupons = [
    ["LAUNCH20", 20],
    ["NEWYEAR", 15],
    ["REFER10", 10],
    ["WINBACK15", 15],
  ];
  for (const [code, discount] of coupons) {
    await conn.query(
      `INSERT IGNORE INTO ${couponsTable} (code, discount_percent) VALUES (?, ?)`,
      [code, discount],
    );
  }

  const [users] = await conn.query(
    `SELECT id FROM users WHERE user_type = 'user' ORDER BY id ASC LIMIT 20`,
  );
  if (!users.length) return;

  const packages = [
    ["Monthly · $9.99", 9.99],
    ["Quarterly · $24.99", 24.99],
    ["Yearly · $79.99", 79.99],
    ["Lifetime · $199", 199],
  ];
  const couponCodes = ["LAUNCH20", "NEWYEAR", "REFER10", "WINBACK15"];
  const cancelReasons = [
    "Too expensive",
    "Lost motivation",
    "Found another app",
    "Plans felt repetitive",
    "Technical issues",
    "Other",
  ];

  for (let i = 0; i < users.length; i += 1) {
    const user = users[i];
    const [pkgLabel, pkgPrice] = packages[i % packages.length];
    const isCancelled = i % 4 === 0;
    const coupon = i % 2 === 0 ? couponCodes[i % couponCodes.length] : null;

    await conn.query(
      `INSERT INTO ${subscriptionsTable}
       (user_id, package_label, package_price, coupon_code, status, cancel_reason, cancelled_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        pkgLabel,
        pkgPrice,
        coupon,
        isCancelled ? "cancelled" : "active",
        isCancelled ? cancelReasons[i % cancelReasons.length] : null,
        isCancelled ? new Date() : null,
      ],
    );
  }
}
