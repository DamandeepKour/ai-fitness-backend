import mysql from "mysql2/promise";

let pool;

function isUnset(value) {
  return value === undefined || value === null || String(value).trim() === "";
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
    throw new Error(
      `Missing database environment variables: ${missing.join(", ")}.\n` +
        "On Render: Dashboard → your Web Service → Environment → add DB_HOST, DB_USER, DB_PASSWORD, DB_NAME.\n" +
        "A .env file in the repo is NOT used on Render (logs show 'injected env (0)').",
    );
  }

  const host = process.env.DB_HOST.trim();
  const isProduction = process.env.NODE_ENV === "production";

  if (isProduction && isLocalOrPrivateHost(host)) {
    throw new Error(
      `DB_HOST is "${host}" — Render cannot reach localhost or private IPs like 192.168.x.x.\n` +
        "Your MySQL at 192.168.1.152 only works on your home network.\n" +
        "Options:\n" +
        "  1) Use a cloud MySQL (PlanetScale, Railway, Aiven, Render MySQL) and set its public hostname as DB_HOST\n" +
        "  2) Run the backend on the same LAN as the DB (not on Render)\n" +
        "  3) Use a VPN/tunnel (advanced, not recommended for production)",
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
