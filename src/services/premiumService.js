import db from "../config/db.js";
import { getUserPlan } from "../repositories/planRepo.js";
import { GROCERY_PARTNERS } from "../data/indianFoodCatalog.js";
import {
  coachReviewsTable,
  groceryListsTable,
  householdMembersTable,
  householdsTable,
  labReportsTable,
  notificationPrefsTable,
  wearableConnectionsTable,
} from "../models/premiumModel.js";

function parseJson(value) {
  if (!value) return null;
  if (typeof value === "object") return value;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
}

function parseDietPlan(dietPlan) {
  const plan = parseJson(dietPlan);
  return Array.isArray(plan) ? plan : [];
}

function extractIngredientsFromPlan(dietPlan) {
  const days = parseDietPlan(dietPlan);
  const ingredients = new Set();

  const keywords = [
    "paneer", "dal", "rice", "roti", "poha", "oats", "egg", "chicken", "fish",
    "curd", "milk", "onion", "tomato", "potato", "spinach", "soya", "rajma",
    "chana", "idli", "dosa", "sambar", "ghee", "oil", "banana", "apple",
  ];

  for (const day of days) {
    const meals = day.meals || {};
    for (const meal of Object.values(meals)) {
      const food = String(meal?.food || "").toLowerCase();
      for (const word of keywords) {
        if (food.includes(word)) ingredients.add(word);
      }
      if (food.includes("chai")) ingredients.add("tea");
      if (food.includes("peanut")) ingredients.add("peanuts");
    }
  }

  return [...ingredients].map((name) => ({
    name: name.charAt(0).toUpperCase() + name.slice(1),
    qty: "1",
    unit: "pack",
  }));
}

// ─── Notifications / WhatsApp ───────────────────────────────────────────────

export async function getNotificationPrefsService(userId) {
  const conn = await db();
  const [rows] = await conn.query(
    `SELECT * FROM ${notificationPrefsTable} WHERE user_id = ?`,
    [userId],
  );

  if (rows[0]) return rows[0];

  await conn.query(
    `INSERT INTO ${notificationPrefsTable} (user_id) VALUES (?)`,
    [userId],
  );

  const [created] = await conn.query(
    `SELECT * FROM ${notificationPrefsTable} WHERE user_id = ?`,
    [userId],
  );
  return created[0];
}

export async function updateNotificationPrefsService(userId, data) {
  const conn = await db();
  await getNotificationPrefsService(userId);

  const fields = [];
  const values = [];
  const allowed = ["whatsapp_enabled", "meal_reminders", "water_reminders", "coaching_tips", "quiet_start", "quiet_end"];

  for (const key of allowed) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(data[key]);
    }
  }

  if (!fields.length) return getNotificationPrefsService(userId);

  values.push(userId);
  await conn.query(
    `UPDATE ${notificationPrefsTable} SET ${fields.join(", ")} WHERE user_id = ?`,
    values,
  );

  return getNotificationPrefsService(userId);
}

export async function sendWhatsAppReminderDemoService(userId) {
  const conn = await db();
  const [users] = await conn.query(
    `SELECT name, mobile_number, country_code FROM users WHERE id = ?`,
    [userId],
  );
  const prefs = await getNotificationPrefsService(userId);
  const user = users[0];

  if (!prefs.whatsapp_enabled) {
    return { sent: false, reason: "WhatsApp reminders are disabled" };
  }

  const phone = `${user?.country_code || "+91"}${user?.mobile_number || ""}`;
  const message = `Hi ${user?.name || "there"}! 🍽️ Time to log your meal on AIFitnova. Aaj ka target poora karein — you've got this!`;

  return {
    sent: true,
    demo: true,
    to: phone,
    message,
    note: "Demo mode — connect Twilio/Meta WhatsApp API in production",
  };
}

// ─── Coach review ───────────────────────────────────────────────────────────

export async function requestCoachReviewService(userId, { userNotes } = {}) {
  const conn = await db();
  const plan = await getUserPlan(userId);

  const [result] = await conn.query(
    `INSERT INTO ${coachReviewsTable} (user_id, plan_id, user_notes, status)
     VALUES (?, ?, ?, 'pending')`,
    [userId, plan?.id ?? null, userNotes || null],
  );

  const [rows] = await conn.query(`SELECT * FROM ${coachReviewsTable} WHERE id = ?`, [result.insertId]);
  return rows[0];
}

export async function getCoachReviewsForUserService(userId) {
  const conn = await db();
  const [rows] = await conn.query(
    `SELECT * FROM ${coachReviewsTable} WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`,
    [userId],
  );
  return rows;
}

export async function getAllCoachReviewsService() {
  const conn = await db();
  const [rows] = await conn.query(
    `SELECT cr.*, u.name AS user_name, u.email AS user_email
     FROM ${coachReviewsTable} cr
     LEFT JOIN users u ON u.id = cr.user_id
     ORDER BY
       CASE cr.status WHEN 'pending' THEN 0 WHEN 'needs_changes' THEN 1 ELSE 2 END,
       cr.created_at DESC
     LIMIT 100`,
  );
  return rows;
}

export async function updateCoachReviewService(reviewId, { status, coachNotes }) {
  const conn = await db();
  await conn.query(
    `UPDATE ${coachReviewsTable} SET status = ?, coach_notes = ?, updated_at = NOW() WHERE id = ?`,
    [status, coachNotes || null, reviewId],
  );
  const [rows] = await conn.query(`SELECT * FROM ${coachReviewsTable} WHERE id = ?`, [reviewId]);
  return rows[0];
}

// ─── Family plans ───────────────────────────────────────────────────────────

export async function getFamilyPlanService(userId) {
  const conn = await db();
  const [households] = await conn.query(
    `SELECT * FROM ${householdsTable} WHERE owner_user_id = ? LIMIT 1`,
    [userId],
  );

  if (!households[0]) return { household: null, members: [] };

  const [members] = await conn.query(
    `SELECT * FROM ${householdMembersTable} WHERE household_id = ? ORDER BY id ASC`,
    [households[0].id],
  );

  return { household: households[0], members };
}

export async function saveFamilyPlanService(userId, { name, members = [] }) {
  const conn = await db();
  let household = (await getFamilyPlanService(userId)).household;

  if (!household) {
    const [result] = await conn.query(
      `INSERT INTO ${householdsTable} (owner_user_id, name) VALUES (?, ?)`,
      [userId, name || "My Family"],
    );
    household = { id: result.insertId, owner_user_id: userId, name: name || "My Family" };
  } else if (name) {
    await conn.query(`UPDATE ${householdsTable} SET name = ? WHERE id = ?`, [name, household.id]);
    household.name = name;
  }

  await conn.query(`DELETE FROM ${householdMembersTable} WHERE household_id = ?`, [household.id]);

  for (const member of members.slice(0, 6)) {
    await conn.query(
      `INSERT INTO ${householdMembersTable}
       (household_id, name, age, gender, goal, diet_type, calories_target)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        household.id,
        member.name,
        member.age || null,
        member.gender || null,
        member.goal || null,
        member.diet_type || null,
        member.calories_target || null,
      ],
    );
  }

  return getFamilyPlanService(userId);
}

// ─── Lab reports ────────────────────────────────────────────────────────────

function buildLabRecommendations(markers) {
  const recs = [];
  const hba1c = Number(markers?.hba1c);
  const vitaminD = Number(markers?.vitamin_d);
  const cholesterol = Number(markers?.cholesterol);
  const hemoglobin = Number(markers?.hemoglobin);

  if (hba1c && hba1c > 5.7) {
    recs.push({ marker: "HbA1c", en: "Reduce refined carbs; prefer dal, millets, and post-meal walks.", hi: "Refined carbs kam karein; dal, millets aur khane ke baad walk karein." });
  }
  if (vitaminD && vitaminD < 30) {
    recs.push({ marker: "Vitamin D", en: "Add 15 min morning sun + fortified milk or supplements.", hi: "Subah 15 min dhoop + fortified doodh ya supplement lein." });
  }
  if (cholesterol && cholesterol > 200) {
    recs.push({ marker: "Cholesterol", en: "Limit ghee/fried snacks; add oats, flaxseed, and fatty fish if non-veg.", hi: "Ghee/tala hua kam karein; oats, flaxseed aur fish (agar non-veg) add karein." });
  }
  if (hemoglobin && hemoglobin < 12) {
    recs.push({ marker: "Hemoglobin", en: "Include spinach, chana, dates, and vitamin C with iron meals.", hi: "Palak, chana, khajoor aur iron ke saath vitamin C lein." });
  }
  if (!recs.length) {
    recs.push({ marker: "General", en: "Markers look manageable — maintain balanced Indian meals and hydration.", hi: "Markers theek lag rahe hain — balanced Indian meals aur paani jari rakhein." });
  }
  return recs;
}

export async function submitLabReportService(userId, { markers, notes }) {
  const conn = await db();
  const recommendations = buildLabRecommendations(markers);

  const [result] = await conn.query(
    `INSERT INTO ${labReportsTable} (user_id, markers, notes, recommendations)
     VALUES (?, ?, ?, ?)`,
    [userId, JSON.stringify(markers || {}), notes || null, JSON.stringify(recommendations)],
  );

  const [rows] = await conn.query(`SELECT * FROM ${labReportsTable} WHERE id = ?`, [result.insertId]);
  const row = rows[0];
  return {
    ...row,
    markers: parseJson(row.markers),
    recommendations: parseJson(row.recommendations),
  };
}

export async function getLabReportsService(userId) {
  const conn = await db();
  const [rows] = await conn.query(
    `SELECT * FROM ${labReportsTable} WHERE user_id = ? ORDER BY created_at DESC LIMIT 10`,
    [userId],
  );
  return rows.map((row) => ({
    ...row,
    markers: parseJson(row.markers),
    recommendations: parseJson(row.recommendations),
  }));
}

// ─── Wearables ────────────────────────────────────────────────────────────────

export async function getWearableStatusService(userId) {
  const conn = await db();
  const [rows] = await conn.query(
    `SELECT * FROM ${wearableConnectionsTable} WHERE user_id = ?`,
    [userId],
  );
  return rows[0] || { status: "disconnected", provider: null, steps_today: 0 };
}

export async function connectWearableService(userId, { provider = "demo" }) {
  const conn = await db();
  const existing = await getWearableStatusService(userId);

  const demoData = {
    steps_today: 6200 + Math.floor(Math.random() * 3000),
    sleep_hours: (6 + Math.random() * 2).toFixed(1),
    heart_rate: 68 + Math.floor(Math.random() * 15),
  };

  if (existing.id) {
    await conn.query(
      `UPDATE ${wearableConnectionsTable}
       SET provider = ?, status = 'connected', steps_today = ?, sleep_hours = ?, heart_rate = ?, last_sync_at = NOW()
       WHERE user_id = ?`,
      [provider, demoData.steps_today, demoData.sleep_hours, demoData.heart_rate, userId],
    );
  } else {
    await conn.query(
      `INSERT INTO ${wearableConnectionsTable}
       (user_id, provider, status, steps_today, sleep_hours, heart_rate, last_sync_at)
       VALUES (?, ?, 'connected', ?, ?, ?, NOW())`,
      [userId, provider, demoData.steps_today, demoData.sleep_hours, demoData.heart_rate],
    );
  }

  return getWearableStatusService(userId);
}

export async function disconnectWearableService(userId) {
  const conn = await db();
  await conn.query(
    `UPDATE ${wearableConnectionsTable} SET status = 'disconnected' WHERE user_id = ?`,
    [userId],
  );
  return getWearableStatusService(userId);
}

// ─── Grocery partnerships ─────────────────────────────────────────────────────

export async function getGroceryListService(userId, { partnerId } = {}) {
  const conn = await db();
  const plan = await getUserPlan(userId);
  const items = extractIngredientsFromPlan(plan?.diet_plan);
  const partner = GROCERY_PARTNERS.find((p) => p.id === partnerId) || GROCERY_PARTNERS[0];
  const estimatedCost = items.length * 45;

  const [result] = await conn.query(
    `INSERT INTO ${groceryListsTable} (user_id, week_label, items, partner, partner_url, estimated_cost_inr)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      userId,
      "This week",
      JSON.stringify(items),
      partner.name,
      partner.url,
      estimatedCost,
    ],
  );

  return {
    id: result.insertId,
    items,
    partner: partner.name,
    partnerUrl: partner.url,
    estimatedCostInr: estimatedCost,
    partners: GROCERY_PARTNERS,
    message: `Shop ${items.length} ingredients via ${partner.name}`,
  };
}

export async function getPremiumOverviewService(userId) {
  const [family, wearable, reviews, labReports, prefs] = await Promise.all([
    getFamilyPlanService(userId),
    getWearableStatusService(userId),
    getCoachReviewsForUserService(userId),
    getLabReportsService(userId),
    getNotificationPrefsService(userId),
  ]);

  return {
    family,
    wearable,
    latestReview: reviews[0] || null,
    latestLabReport: labReports[0] || null,
    notifications: prefs,
    features: {
      coachReview: true,
      familyPlans: true,
      whatsappReminders: true,
      labReports: true,
      wearables: true,
      groceryPartners: true,
    },
  };
}
