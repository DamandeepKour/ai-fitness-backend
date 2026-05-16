import mysql from "mysql2/promise";

let pool;

function isUnset(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function isRailwayInternalHost(host) {
  const h = String(host || "").trim().toLowerCase();
  return h.endsWith(".railway.internal") || h === "mysql.railway.internal";
}

function parseMysqlUrl(url) {
  const parsed = new URL(url.trim());
  return {
    host: parsed.hostname,
    port: parsed.port || "3306",
    user: parsed.username ? decodeURIComponent(parsed.username) : "",
    password: parsed.password ? decodeURIComponent(parsed.password) : "",
    database: parsed.pathname?.replace(/^\//, "")
      ? decodeURIComponent(parsed.pathname.replace(/^\//, ""))
      : "",
  };
}

/** Map Railway / single-URL MySQL env into DB_* before validation. */
export function hydrateDbEnvFromProvider() {
  const isProduction = process.env.NODE_ENV === "production";
  // Render is outside Railway — internal hostnames never work there.
  const url =
    (isProduction ? process.env.MYSQL_PUBLIC_URL : null) ||
    process.env.MYSQL_PUBLIC_URL ||
    process.env.MYSQL_URL;

  if (url?.trim().toLowerCase().startsWith("mysql")) {
    try {
      const { host, port, user, password, database } = parseMysqlUrl(url);
      process.env.DB_HOST = host;
      process.env.DB_PORT = port;
      if (user) process.env.DB_USER = user;
      if (password) process.env.DB_PASSWORD = password;
      if (database) process.env.DB_NAME = database;
    } catch {
      /* fall through to individual vars */
    }
  }

  // Railway MySQL plugin (MYSQLHOST, MYSQLPORT, …)
  const railwayMap = [
    ["MYSQLHOST", "DB_HOST"],
    ["MYSQLPORT", "DB_PORT"],
    ["MYSQLUSER", "DB_USER"],
    ["MYSQLPASSWORD", "DB_PASSWORD"],
    ["MYSQLDATABASE", "DB_NAME"],
  ];
  for (const [from, to] of railwayMap) {
    if (isUnset(process.env[to]) && !isUnset(process.env[from])) {
      process.env[to] = String(process.env[from]).trim();
    }
  }

  if (process.env.DB_SSL === undefined && process.env.MYSQL_SSL === "true") {
    process.env.DB_SSL = "true";
  }
}

function isLocalOrPrivateHost(host) {
  if (!host) return true;
  const h = String(host).trim().toLowerCase();
  if (h === "localhost" || h === "127.0.0.1" || h === "::1") return true;
  // Private LAN — works on your Wi‑Fi only, NOT from Render/cloud
  if (/^192\.168\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^10\.\d{1,3}\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  if (/^172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}$/.test(h)) return true;
  return false;
}

function requireDbEnv() {
  const missing = ["DB_HOST", "DB_USER", "DB_NAME"].filter((k) => isUnset(process.env[k]));
  if (missing.length) {
    const hasUrl = Boolean(
      process.env.MYSQL_PUBLIC_URL?.trim() || process.env.MYSQL_URL?.trim(),
    );
    throw new Error(
      `Missing database environment variables: ${missing.join(", ")}.` +
        (hasUrl
          ? " MYSQL_URL was set but could not be parsed — redeploy latest code from git."
          : " Set MYSQL_PUBLIC_URL from Railway (not the .railway.internal URL).") +
        " A .env file in the repo is not used on Render.",
    );
  }

  const host = process.env.DB_HOST.trim();
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && isRailwayInternalHost(host)) {
    throw new Error(
      `DB_HOST is "${host}" — that is Railway's private network host. ` +
        "On Render use Railway → MySQL → Connect → MYSQL_PUBLIC_URL (hostname like *.proxy.rlwy.net), not MYSQL_URL with .railway.internal.",
    );
  }

  if (isProduction && isLocalOrPrivateHost(host)) {
    throw new Error(
      `DB_HOST is "${host}" — use Railway MYSQL_PUBLIC_URL or a public DB_HOST on Render.`,
    );
  }
}

function buildPoolConfig() {
  const port = Number(process.env.DB_PORT) || 3306;
  const useSsl =
    process.env.DB_SSL === "true" ||
    process.env.DB_SSL === "1" ||
    process.env.MYSQL_SSL === "true";

  return {
    host: process.env.DB_HOST.trim(),
    user: process.env.DB_USER.trim(),
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME.trim(),
    port,
    waitForConnections: true,
    connectionLimit: 10,
    connectTimeout: 30_000,
    enableKeepAlive: true,
    keepAliveInitialDelay: 10_000,
    ...(useSsl ? { ssl: { rejectUnauthorized: false } } : {}),
  };
}

const db = async () => {
  if (!pool) {
    hydrateDbEnvFromProvider();
    requireDbEnv();

    const config = buildPoolConfig();
    pool = mysql.createPool(config);

    try {
      await pool.query("SELECT 1");
    } catch (err) {
      pool = null;
      const hint =
        process.env.NODE_ENV === "production"
          ? " Check DB_HOST is a public cloud hostname, port 3306 is open, and DB_SSL=true if required."
          : "";
      throw new Error(`MySQL connection failed (${config.host}:${config.port}): ${err.message}.${hint}`);
    }

    console.log("✅ DB Connected:", {
      host: config.host,
      port: config.port,
      database: config.database,
      user: config.user,
      ssl: Boolean(config.ssl),
    });
  }

  return pool;
};

export default db;
