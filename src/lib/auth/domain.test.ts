import { describe, expect, it } from "vitest";
import { isAllowedEmail } from "./domain";

const DOMAIN = "folio3.com";

describe("isAllowedEmail (SEC-2/EC-A3)", () => {
  it("accepts exact-domain addresses, case-insensitively", () => {
    expect(isAllowedEmail("someone@folio3.com", DOMAIN)).toBe(true);
    expect(isAllowedEmail("SOMEONE@FOLIO3.COM", DOMAIN)).toBe(true);
    expect(isAllowedEmail("someone@Folio3.Com", DOMAIN)).toBe(true);
  });

  it("accepts plus-addressing on the same domain", () => {
    expect(isAllowedEmail("someone+tag@folio3.com", DOMAIN)).toBe(true);
  });

  it("rejects other domains", () => {
    expect(isAllowedEmail("someone@gmail.com", DOMAIN)).toBe(false);
    expect(isAllowedEmail("someone@anothercompany.com", DOMAIN)).toBe(false);
    expect(isAllowedEmail("someone@outlook.com", DOMAIN)).toBe(false);
  });

  it("rejects subdomain and suffix tricks (EC-A3)", () => {
    expect(isAllowedEmail("user@sub.folio3.com", DOMAIN)).toBe(false);
    expect(isAllowedEmail("user@folio3.com.evil.com", DOMAIN)).toBe(false);
    expect(isAllowedEmail("user@notfolio3.com", DOMAIN)).toBe(false);
    expect(isAllowedEmail("user@folio3.co", DOMAIN)).toBe(false);
  });

  it("checks the domain after the LAST @ (quoted local parts)", () => {
    expect(isAllowedEmail('"user@folio3.com"@evil.com', DOMAIN)).toBe(false);
  });

  it("rejects malformed input", () => {
    expect(isAllowedEmail("", DOMAIN)).toBe(false);
    expect(isAllowedEmail(null, DOMAIN)).toBe(false);
    expect(isAllowedEmail(undefined, DOMAIN)).toBe(false);
    expect(isAllowedEmail("no-at-sign", DOMAIN)).toBe(false);
    expect(isAllowedEmail("@folio3.com", DOMAIN)).toBe(false);
    expect(isAllowedEmail("user@", DOMAIN)).toBe(false);
  });
});
