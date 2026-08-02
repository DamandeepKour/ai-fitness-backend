import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getAllowedCorsOrigins, validateEnv } from "../../../src/config/env.js";

const KEYS = [
  "NODE_ENV",
  "JWT_SECRET",
  "JWT_EXPIRES_IN",
  "DB_HOST",
  "DB_USER",
  "DB_NAME",
  "FRONTEND_URL",
  "GROQ_API_KEY",
  "CORS_ORIGINS",
];

const snapshot = {};

beforeEach(() => {
  for (const key of KEYS) {
    snapshot[key] = process.env[key];
  }
});

afterEach(() => {
  for (const key of KEYS) {
    if (snapshot[key] === undefined) delete process.env[key];
    else process.env[key] = snapshot[key];
  }
});

function baseEnv(overrides = {}) {
  process.env.NODE_ENV = "development";
  process.env.JWT_SECRET = "dev-secret-at-least-8";
  process.env.JWT_EXPIRES_IN = "7d";
  process.env.DB_HOST = "localhost";
  process.env.DB_USER = "root";
  process.env.DB_NAME = "fitnova";
  process.env.FRONTEND_URL = "http://localhost:5173";
  process.env.GROQ_API_KEY = "test-key";
  Object.assign(process.env, overrides);
}

describe("validateEnv", () => {
  it("accepts valid development config", () => {
    baseEnv();
    expect(() => validateEnv({ requireAi: false })).not.toThrow();
  });

  it("rejects missing JWT_SECRET", () => {
    baseEnv();
    delete process.env.JWT_SECRET;
    expect(() => validateEnv({ requireAi: false })).toThrow(/JWT_SECRET|Invalid environment/i);
  });

  it("rejects placeholder JWT_SECRET in production", () => {
    baseEnv({
      NODE_ENV: "production",
      JWT_SECRET: "change-to-a-long-random-string-xxxxxxxxxx",
      FRONTEND_URL: "https://app.example.com",
      GROQ_API_KEY: "gsk_live_test_key_123456",
    });
    expect(() => validateEnv()).toThrow(/JWT_SECRET must be a strong random secret/i);
  });

  it("rejects localhost FRONTEND_URL in production", () => {
    baseEnv({
      NODE_ENV: "production",
      JWT_SECRET: "a".repeat(40),
      FRONTEND_URL: "http://localhost:5173",
      GROQ_API_KEY: "gsk_live_test_key_123456",
    });
    expect(() => validateEnv()).toThrow(/FRONTEND_URL must be a public URL/i);
  });
});

describe("getAllowedCorsOrigins", () => {
  it("includes localhost origins outside production", () => {
    baseEnv({ NODE_ENV: "development", FRONTEND_URL: "http://localhost:5173" });
    const origins = getAllowedCorsOrigins();
    expect(origins).toContain("http://localhost:5173");
    expect(origins).toContain("http://127.0.0.1:5173");
  });

  it("includes CORS_ORIGINS extras", () => {
    baseEnv({
      NODE_ENV: "development",
      FRONTEND_URL: "http://localhost:5173",
      CORS_ORIGINS: "https://staging.example.com, https://preview.example.com",
    });
    const origins = getAllowedCorsOrigins();
    expect(origins).toContain("https://staging.example.com");
    expect(origins).toContain("https://preview.example.com");
  });
});
