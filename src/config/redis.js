import Redis from "ioredis";

let redis = null;

/**
 * Render internal Redis uses redis:// (no TLS). External URLs may use rediss://.
 */
function redisOptions() {
  const url = process.env.REDIS_URL;
  if (!url) return null;

  const opts = {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    connectTimeout: 15_000,
    lazyConnect: true,
  };

  if (url.startsWith("rediss://")) {
    opts.tls = {};
  }

  return opts;
}

export function getRedis() {
  if (!process.env.REDIS_URL) {
    return null;
  }

  if (!redis) {
    const opts = redisOptions();
    redis = new Redis(process.env.REDIS_URL, opts);

    redis.on("connect", () => {
      console.log("✅ Redis Connected");
    });

    redis.on("error", (err) => {
      console.error("❌ Redis Error:", err.message);
    });
  }

  return redis;
}

/** Connect at startup when REDIS_URL is set (optional; auth still works without Redis). */
export async function connectRedis() {
  const client = getRedis();
  if (!client) {
    console.warn("⚠️ REDIS_URL not set — caching and token blacklist disabled");
    return null;
  }

  try {
    await client.connect();
    return client;
  } catch (err) {
    console.error("❌ Redis connect failed:", err.message);
    return null;
  }
}

