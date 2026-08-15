import { describe, expect, it } from "vitest";
import { computeStreakFromDates } from "../../../src/modules/users/streakService.js";

describe("computeStreakFromDates", () => {
  it("counts consecutive days ending today", () => {
    const result = computeStreakFromDates(
      ["2026-07-30", "2026-07-31", "2026-08-01"],
      "2026-08-01",
    );
    expect(result.currentStreak).toBe(3);
    expect(result.longestStreak).toBe(3);
    expect(result.lastLogDate).toBe("2026-08-01");
  });

  it("falls back to yesterday when today has no log", () => {
    const result = computeStreakFromDates(
      ["2026-07-30", "2026-07-31"],
      "2026-08-01",
    );
    expect(result.currentStreak).toBe(2);
    expect(result.lastLogDate).toBe("2026-07-31");
  });

  it("returns zero current streak when gap is older than yesterday", () => {
    const result = computeStreakFromDates(["2026-07-20", "2026-07-21"], "2026-08-01");
    expect(result.currentStreak).toBe(0);
    expect(result.longestStreak).toBe(2);
  });

  it("handles empty history", () => {
    const result = computeStreakFromDates([], "2026-08-01");
    expect(result).toEqual({
      currentStreak: 0,
      longestStreak: 0,
      lastLogDate: null,
    });
  });

  it("computes longest run across broken streaks", () => {
    const result = computeStreakFromDates(
      ["2026-07-01", "2026-07-02", "2026-07-03", "2026-07-10", "2026-08-01"],
      "2026-08-01",
    );
    expect(result.currentStreak).toBe(1);
    expect(result.longestStreak).toBe(3);
  });
});
