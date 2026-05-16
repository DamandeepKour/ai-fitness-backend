import mysql from "mysql2/promise";

let pool;

function requireDbEnv() {
  const missing = ["DB_HOST", "DB_USER", "DB_NAME"].filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(
      `Missing database env on server: ${missing.join(", ")}. ` +
        "Set them in Render → Environment (not only in a local .env file).",
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
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD || "",
    database: process.env.DB_NAME,
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

    // Prove the pool can reach MySQL (createPool alone does not connect).
    await pool.query("SELECT 1");

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
