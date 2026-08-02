import { beforeEach, describe, expect, it, vi } from "vitest";
import request from "supertest";
import {
  buildTestApp,
  makeAuthToken,
  sampleMealBody,
  samplePlanBody,
} from "../helpers/testApp.js";

vi.mock("../../src/services/authService.js", () => ({
  signupService: vi.fn(async () => ({
    id: 42,
    user_type: "user",
    emailSent: false,
    message: "User registered successfully",
  })),
  loginService: vi.fn(async ({ email }) => ({
    token: "mock-jwt-token",
    user: { id: 42, email, user_type: "user", name: "Tester" },
  })),
  magicLoginService: vi.fn(),
  forgotPasswordService: vi.fn(async () => ({
    emailSent: true,
    message: "If an account exists for this email, a reset link has been sent.",
  })),
  resetPasswordService: vi.fn(),
  verifyEmailService: vi.fn(),
}));

vi.mock("../../src/services/dailyLogService.js", () => ({
  addDailyLogService: vi.fn(async () => ({
    id: 99,
    inserted: true,
    meal_type: "breakfast",
  })),
  getDailySummaryService: vi.fn(async () => ({
    date: "2026-08-02",
    totals: { calories: 320, protein: 12, carbs: 48, fat: 8 },
    logs: [],
  })),
}));

vi.mock("../../src/services/streakService.js", () => ({
  getStreakService: vi.fn(async () => ({
    userId: 1,
    currentStreak: 3,
    longestStreak: 5,
    lastLogDate: "2026-08-02",
  })),
  calculateAndSaveStreak: vi.fn(),
  computeStreakFromDates: vi.fn(),
}));

vi.mock("../../src/services/planService.js", () => ({
  default: vi.fn(async () => ({
    goal: "fat_loss",
    calories: 1800,
    diet_plan: { monday: { breakfast: "Oats" } },
    workout_plan: { monday: ["squats"] },
  })),
}));

vi.mock("../../src/jobs/queues.js", () => ({
  enqueueStreakJob: vi.fn(async () => ({ id: "streak-job" })),
  enqueueAiPlanJob: vi.fn(),
}));

vi.mock("../../src/jobs/connection.js", () => ({
  isQueueEnabled: () => false,
  getBullConnection: () => null,
}));

describe("Auth routes (integration)", () => {
  let app;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildTestApp();
  });

  it("POST /api/v1/auth/signup returns success payload", async () => {
    const res = await request(app)
      .post("/api/v1/auth/signup")
      .send({
        name: "Tester",
        email: "tester@example.com",
        password: "Secret123",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.id).toBe(42);
  });

  it("POST /api/v1/auth/login returns token", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "tester@example.com", password: "Secret123" });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeTruthy();
  });

  it("POST /api/v1/auth/forgot-password does not leak reset token", async () => {
    const res = await request(app)
      .post("/api/v1/auth/forgot-password")
      .send({ email: "tester@example.com" });

    expect(res.status).toBe(200);
    expect(res.body.data.resetToken).toBeUndefined();
  });
});

describe("Meal logging routes (integration)", () => {
  let app;
  let token;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildTestApp();
    token = makeAuthToken({ id: 1 });
  });

  it("POST /api/v1/daily-log/add creates a meal log", async () => {
    const res = await request(app)
      .post("/api/v1/daily-log/add")
      .set("Authorization", `Bearer ${token}`)
      .send(sampleMealBody);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.food_name).toBe("Oats with milk");
  });

  it("POST /api/v1/daily-log/add rejects invalid meal_type", async () => {
    const res = await request(app)
      .post("/api/v1/daily-log/add")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...sampleMealBody, meal_type: "brunch" });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it("GET /api/v1/daily-log/summary requires auth", async () => {
    const res = await request(app).get("/api/v1/daily-log/summary");
    expect(res.status).toBe(401);
  });

  it("GET /api/v1/daily-log/streak returns streak data", async () => {
    const res = await request(app)
      .get("/api/v1/daily-log/streak")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.currentStreak).toBe(3);
  });
});

describe("AI plan routes (integration)", () => {
  let app;
  let token;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildTestApp();
    token = makeAuthToken({ id: 1 });
  });

  it("POST /api/v1/plan/generate-plan returns mocked plan", async () => {
    const res = await request(app)
      .post("/api/v1/plan/generate-plan")
      .set("Authorization", `Bearer ${token}`)
      .send(samplePlanBody);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.diet_plan).toBeTruthy();
    expect(res.body.data.workout_plan).toBeTruthy();
  });

  it("POST /api/v1/plan/generate-plan validates body", async () => {
    const res = await request(app)
      .post("/api/v1/plan/generate-plan")
      .set("Authorization", `Bearer ${token}`)
      .send({ weight: 70 });

    expect(res.status).toBe(400);
  });

  it("rejects unauthenticated plan generation", async () => {
    const res = await request(app)
      .post("/api/v1/plan/generate-plan")
      .send(samplePlanBody);

    expect(res.status).toBe(401);
  });
});
