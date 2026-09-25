import { describe, expect, it } from "vitest";
import { RESERVED_USERNAMES, normalizeUsername, usernameSchema } from "@/features/sellers/username";

describe("usernameSchema", () => {
  it("accepts a valid username", () => {
    expect(usernameSchema.safeParse("maple_homes.716").success).toBe(true);
  });

  it("rejects usernames under 3 characters", () => {
    expect(usernameSchema.safeParse("ab").success).toBe(false);
  });

  it("rejects usernames over 30 characters", () => {
    expect(usernameSchema.safeParse("a".repeat(31)).success).toBe(false);
  });

  it("rejects invalid characters", () => {
    expect(usernameSchema.safeParse("maple homes!").success).toBe(false);
    expect(usernameSchema.safeParse("maple@homes").success).toBe(false);
  });

  it("rejects reserved names case-insensitively", () => {
    expect(usernameSchema.safeParse("admin").success).toBe(false);
    expect(usernameSchema.safeParse("Admin").success).toBe(false);
    expect(usernameSchema.safeParse("SUPPORT").success).toBe(false);
  });

  it("includes the documented reserved routes", () => {
    for (const name of [
      "admin",
      "support",
      "api",
      "login",
      "signup",
      "properties",
      "homes",
      "search",
      "dashboard",
      "settings",
      "account",
      "sellers",
      "open-houses",
      "coming-soon",
    ]) {
      expect(RESERVED_USERNAMES).toContain(name);
    }
  });
});

describe("normalizeUsername", () => {
  it("lowercases and trims", () => {
    expect(normalizeUsername("  MapleHomes  ")).toBe("maplehomes");
  });
});
