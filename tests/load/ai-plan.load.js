#!/usr/bin/env node
/**
 * Load test AI plan endpoint with autocannon.
 *
 * Usage:
 *   AI_LOAD_BASE_URL=https://your-api.example.com \
 *   AI_LOAD_TOKEN=<jwt> \
 *   npm run test:load
 *
 * Defaults to http://localhost:5000 and skips if no token is provided.
 */
import autocannon from "autocannon";

const baseUrl = (process.env.AI_LOAD_BASE_URL || "http://localhost:5000").replace(/\/$/, "");
const token = process.env.AI_LOAD_TOKEN;
const connections = Number(process.env.AI_LOAD_CONNECTIONS || 5);
const duration = Number(process.env.AI_LOAD_DURATION || 10);
const amount = Number(process.env.AI_LOAD_AMOUNT || 0);

if (!token) {
  console.error("AI_LOAD_TOKEN is required (Bearer JWT for an authenticated user).");
  console.error("Example:");
  console.error("  AI_LOAD_TOKEN=eyJ... npm run test:load");
  process.exit(1);
}

const body = JSON.stringify({
  weight: 70,
  height: 170,
  goal: "fat_loss",
  diet_type: "veg",
  plan_type: "weekly",
  workout_type: "home",
  workout_focus: "balanced",
});

const url = `${baseUrl}/api/v1/plan/generate-plan`;

console.log(`Load testing ${url}`);
console.log(`connections=${connections} duration=${duration}s${amount ? ` amount=${amount}` : ""}`);

const instance = autocannon({
  url,
  method: "POST",
  connections,
  duration: amount ? undefined : duration,
  amount: amount || undefined,
  headers: {
    "content-type": "application/json",
    authorization: `Bearer ${token}`,
  },
  body,
  timeout: 60,
});

autocannon.track(instance, { renderProgressBar: true });

instance.on("done", (result) => {
  console.log("\n--- Summary ---");
  console.log(`Requests: ${result.requests.total}`);
  console.log(`Throughput: ${result.throughput.average} bytes/sec avg`);
  console.log(`Latency p50: ${result.latency.p50}ms | p99: ${result.latency.p99}ms`);
  console.log(`Non-2xx: ${result.non2xx}`);
  console.log(`Errors: ${result.errors}`);

  // Soft pass criteria for CI-ish local runs
  if (result.errors > 0 && result.non2xx === result.requests.total) {
    process.exitCode = 1;
  }
});
