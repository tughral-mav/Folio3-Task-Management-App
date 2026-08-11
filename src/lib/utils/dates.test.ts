import { describe, expect, it } from "vitest";
import { isDueSoon, isOverdue } from "./dates";

const NOW = new Date("2026-08-11T12:00:00Z");
const YESTERDAY = "2026-08-10T12:00:00Z";
const TOMORROW = "2026-08-12T12:00:00Z";
const NEXT_WEEK = "2026-08-18T12:00:00Z";

describe("isOverdue (FR36/EC-T7)", () => {
  it("is overdue when due date passed and task is active", () => {
    expect(isOverdue(YESTERDAY, "TODO", NOW)).toBe(true);
    expect(isOverdue(YESTERDAY, "IN_PROGRESS", NOW)).toBe(true);
    expect(isOverdue(YESTERDAY, "BLOCKED", NOW)).toBe(true);
  });

  it("a completed-late or cancelled task is never overdue", () => {
    expect(isOverdue(YESTERDAY, "COMPLETED", NOW)).toBe(false);
    expect(isOverdue(YESTERDAY, "CANCELLED", NOW)).toBe(false);
  });

  it("future due dates are not overdue", () => {
    expect(isOverdue(TOMORROW, "TODO", NOW)).toBe(false);
  });

  it("invalid dates fail safe (not overdue)", () => {
    expect(isOverdue("not-a-date", "TODO", NOW)).toBe(false);
  });
});

describe("isDueSoon (FR35)", () => {
  it("flags tasks due within the window", () => {
    expect(isDueSoon(TOMORROW, "TODO", NOW)).toBe(true);
  });

  it("ignores far-future, overdue, and closed tasks", () => {
    expect(isDueSoon(NEXT_WEEK, "TODO", NOW)).toBe(false);
    expect(isDueSoon(YESTERDAY, "TODO", NOW)).toBe(false);
    expect(isDueSoon(TOMORROW, "COMPLETED", NOW)).toBe(false);
  });
});
