import db from "../config/db.js";

export const notificationPrefsTable = "notification_preferences";
export const coachReviewsTable = "coach_reviews";
export const householdsTable = "households";
export const householdMembersTable = "household_members";
export const labReportsTable = "lab_reports";
export const wearableConnectionsTable = "wearable_connections";
export const groceryListsTable = "grocery_lists";

const tables = {
  [notificationPrefsTable]: {
    id: "INT AUTO_INCREMENT PRIMARY KEY",
    user_id: "INT NOT NULL UNIQUE",
    whatsapp_enabled: "TINYINT(1) DEFAULT 0",
    meal_reminders: "TINYINT(1) DEFAULT 1",
    water_reminders: "TINYINT(1) DEFAULT 1",
    coaching_tips: "TINYINT(1) DEFAULT 1",
    quiet_start: "VARCHAR(5) DEFAULT '22:00'",
    quiet_end: "VARCHAR(5) DEFAULT '07:00'",
    updated_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
  },
  [coachReviewsTable]: {
    id: "INT AUTO_INCREMENT PRIMARY KEY",
    user_id: "INT NOT NULL",
    plan_id: "INT NULL",
    status: "ENUM('pending','approved','needs_changes') DEFAULT 'pending'",
    user_notes: "TEXT NULL",
    coach_notes: "TEXT NULL",
    created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
    updated_at: "TIMESTAMP NULL DEFAULT NULL ON UPDATE CURRENT_TIMESTAMP",
  },
  [householdsTable]: {
    id: "INT AUTO_INCREMENT PRIMARY KEY",
    owner_user_id: "INT NOT NULL",
    name: "VARCHAR(120) DEFAULT 'My Family'",
    plan_tier: "VARCHAR(30) DEFAULT 'family'",
    created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
  },
  [householdMembersTable]: {
    id: "INT AUTO_INCREMENT PRIMARY KEY",
    household_id: "INT NOT NULL",
    name: "VARCHAR(100) NOT NULL",
    age: "INT NULL",
    gender: "VARCHAR(10) NULL",
    goal: "VARCHAR(50) NULL",
    diet_type: "VARCHAR(50) NULL",
    calories_target: "INT NULL",
    created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
  },
  [labReportsTable]: {
    id: "INT AUTO_INCREMENT PRIMARY KEY",
    user_id: "INT NOT NULL",
    markers: "JSON NULL",
    notes: "TEXT NULL",
    recommendations: "JSON NULL",
    created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
  },
  [wearableConnectionsTable]: {
    id: "INT AUTO_INCREMENT PRIMARY KEY",
    user_id: "INT NOT NULL UNIQUE",
    provider: "VARCHAR(30) DEFAULT 'demo'",
    status: "ENUM('disconnected','connected') DEFAULT 'disconnected'",
    steps_today: "INT DEFAULT 0",
    sleep_hours: "DECIMAL(4,1) DEFAULT 0",
    heart_rate: "INT DEFAULT 0",
    last_sync_at: "TIMESTAMP NULL DEFAULT NULL",
    created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
  },
  [groceryListsTable]: {
    id: "INT AUTO_INCREMENT PRIMARY KEY",
    user_id: "INT NOT NULL",
    week_label: "VARCHAR(50) NULL",
    items: "JSON NULL",
    partner: "VARCHAR(50) NULL",
    partner_url: "VARCHAR(500) NULL",
    estimated_cost_inr: "INT DEFAULT 0",
    created_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP",
  },
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

export async function syncPremiumTables() {
  for (const [tableName, columns] of Object.entries(tables)) {
    await syncTable(tableName, columns);
  }
}
