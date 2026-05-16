import Redis from "ioredis";

let redis;

try {
  redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
    tls: {}
  });

  redis.on("connect", () => {
    console.log("✅ Redis Connected");
  });

  redis.on("error", (err) => {
    console.log("❌ Redis Error:", err.message);
  });

} catch (err) {
  console.log("Redis Init Error:", err.message);
}

export { redis };