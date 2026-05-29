import db from "../config/db.js";

function isFilled(column) {
  return `${column} IS NOT NULL AND TRIM(${column}) <> ''`;
}

function toCountMap(rows, key) {
  return rows.reduce((acc, row) => {
    const name = row[key] || "unknown";
    acc[name] = Number(row.total || 0);
    return acc;
  }, {});
}

export async function getSuperadminAnalyticsService() {
  const conn = await db();

  const [[totalRow]] = await conn.query("SELECT COUNT(*) AS totalSignups FROM users");

  const [[activeRow]] = await conn.query(
    `SELECT COUNT(*) AS activeUsers
     FROM users
     WHERE last_updated_at IS NOT NULL
       AND last_updated_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)`,
  );

  const [[onboardingRow]] = await conn.query(
    `SELECT COUNT(*) AS onboardingCompleted
     FROM users
     WHERE ${isFilled("mobile_number")}
       AND ${isFilled("country_code")}
       AND age IS NOT NULL
       AND ${isFilled("gender")}
       AND height IS NOT NULL
       AND weight IS NOT NULL
       AND ${isFilled("goal")}
       AND ${isFilled("diet_type")}
       AND ${isFilled("activity_level")}`,
  );

  const [goalRows] = await conn.query(
    `SELECT goal, COUNT(*) AS total
     FROM users
     WHERE goal IS NOT NULL AND TRIM(goal) <> ''
     GROUP BY goal`,
  );

  const [regionRows] = await conn.query(
    `SELECT country_code, COUNT(*) AS total
     FROM users
     WHERE country_code IS NOT NULL AND TRIM(country_code) <> ''
     GROUP BY country_code`,
  );

  const [languageRows] = await conn.query(
    `SELECT language, COUNT(*) AS total
     FROM users
     WHERE language IS NOT NULL AND TRIM(language) <> ''
     GROUP BY language`,
  );

  return {
    totalSignups: Number(totalRow.totalSignups || 0),
    activeUsers: Number(activeRow.activeUsers || 0),
    onboardingCompleted: Number(onboardingRow.onboardingCompleted || 0),
    goalSplit: toCountMap(goalRows, "goal"),
    regionPreference: toCountMap(regionRows, "country_code"),
    languagePreference: toCountMap(languageRows, "language"),
  };
}

export async function getSuperadminUsersService() {
  const conn = await db();
  const [rows] = await conn.query(
    `SELECT id, name, email, user_type, created_at, last_updated_at
     FROM users
     ORDER BY id DESC`,
  );

  return rows.map((row) => ({
    ...row,
    last_login: row.last_updated_at || row.created_at,
    is_active: Boolean(
      row.last_updated_at &&
        new Date(row.last_updated_at).getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000,
    ),
  }));
}

export async function getSuperadminUserByIdService(userId) {
  const conn = await db();
  const [rows] = await conn.query(
    `SELECT
      id, name, email, user_type, mobile_number, country_code, language, age, gender,
      height, weight, goal, diet_type, activity_level, created_at, last_updated_at
     FROM users
     WHERE id = ?
     LIMIT 1`,
    [userId],
  );

  if (!rows[0]) return null;

  const row = rows[0];
  return {
    ...row,
    last_login: row.last_updated_at || row.created_at,
    is_active: Boolean(
      row.last_updated_at &&
        new Date(row.last_updated_at).getTime() >= Date.now() - 30 * 24 * 60 * 60 * 1000,
    ),
  };
}

export async function getCompleteProfileUsersService() {
  const conn = await db();
  const [rows] = await conn.query(
    `SELECT
      id, name, email, user_type, mobile_number, country_code, age, gender,
      height, weight, goal, diet_type, activity_level, created_at, last_updated_at
     FROM users
     WHERE ${isFilled("name")}
       AND ${isFilled("email")}
       AND ${isFilled("mobile_number")}
       AND ${isFilled("country_code")}
       AND age IS NOT NULL
       AND ${isFilled("gender")}
       AND height IS NOT NULL
       AND weight IS NOT NULL
       AND ${isFilled("goal")}
       AND ${isFilled("diet_type")}
       AND ${isFilled("activity_level")}
     ORDER BY last_updated_at DESC, id DESC`,
  );

  return rows;
}
