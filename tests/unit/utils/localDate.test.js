import { describe, expect, it } from "vitest";
import { isValidYmd, serverCalendarYmd } from "../../../src/utils/localDate.js";

describe("localDate utils", () => {
  it("accepts valid YYYY-MM-DD", () => {
    expect(isValidYmd("2026-08-02")).toBe(true);
  });

  it("rejects invalid formats", () => {
    expect(isValidYmd("2026/08/02")).toBe(false);
    expect(isValidYmd("08-02-2026")).toBe(false);
    expect(isValidYmd("")).toBe(false);
    expect(isValidYmd(null)).toBe(false);
  });

  it("returns today as YYYY-MM-DD", () => {
    expect(serverCalendarYmd()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
