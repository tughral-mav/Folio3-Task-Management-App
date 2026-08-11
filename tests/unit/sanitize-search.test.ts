import { describe, expect, it } from "vitest";
import { sanitizeSearch } from "@/lib/utils/search";

/**
 * Finding #1 (code review): the search term is placed into a PostgREST filter
 * DSL, so it must be a safe ilike literal — no filter metacharacters, no
 * wildcards, no quotes. These tests pin that behavior.
 */
describe("sanitizeSearch", () => {
  it("keeps ordinary words, emails, and names", () => {
    expect(sanitizeSearch("dashboard")).toBe("dashboard");
    expect(sanitizeSearch("jane.doe@folio3.com")).toBe("jane.doe@folio3.com");
    expect(sanitizeSearch("Q3-report")).toBe("Q3-report");
  });

  it("strips PostgREST/LIKE metacharacters that could break out of the filter", () => {
    // commas and parens start new terms / groups
    expect(sanitizeSearch("a,role.eq.ADMIN")).toBe("a role.eq.ADMIN");
    expect(sanitizeSearch("x(y)")).toBe("x y");
    // LIKE wildcards
    expect(sanitizeSearch("50%_off")).toBe("50 off");
    // PostgREST wildcard and backslash
    expect(sanitizeSearch("*")).toBe("");
    expect(sanitizeSearch("a*b")).toBe("a b");
    expect(sanitizeSearch("a\\b")).toBe("a b");
    // quotes
    expect(sanitizeSearch('a"b')).toBe("a b");
  });

  it("collapses whitespace and trims", () => {
    expect(sanitizeSearch("  hello   world  ")).toBe("hello world");
  });

  it("reduces a pure-metacharacter payload to empty (no search applied)", () => {
    expect(sanitizeSearch("%,()*\\\"")).toBe("");
  });
});
