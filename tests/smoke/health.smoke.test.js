import { describe, expect, it } from "vitest";
import request from "supertest";
import { buildTestApp } from "../helpers/testApp.js";

/**
 * Deployment smoke tests — fast checks that the process surface is healthy.
 * Run against createApp (no DB/AI required for /health).
 */
describe("Deployment smoke", () => {
  const app = buildTestApp();

  it("GET / returns service metadata", async () => {
    const res = await request(app).get("/");
    expect(res.status).toBe(200);
    expect(res.body.service).toBe("ai-fitness-backend");
    expect(res.body.api).toBe("/api/v1");
  });

  it("GET /health is alive", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(res.body.check).toBe("liveness");
    expect(res.body).not.toHaveProperty("GROQ_API_KEY");
    expect(res.body).not.toHaveProperty("JWT_SECRET");
  });

  it("GET /ready returns structured readiness payload", async () => {
    const res = await request(app).get("/ready");
    expect([200, 503]).toContain(res.status);
    expect(res.body).toHaveProperty("ready");
    expect(res.body.checks).toHaveProperty("mysql");
    expect(res.body.checks).toHaveProperty("ai");
    expect(JSON.stringify(res.body)).not.toMatch(/password|api[_-]?key|secret/i);
  });

  it("unknown routes return 404 JSON", async () => {
    const res = await request(app).get("/api/v1/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  it("supports legacy /api alias path shape", async () => {
    const res = await request(app).get("/api/v1/does-not-exist");
    expect(res.status).toBe(404);
  });
});
