import { describe, expect, it } from "vitest";
import { isHoneypotTriggered } from "@/lib/anti-spam/honeypot";

describe("isHoneypotTriggered", () => {
  it("is false for undefined, null, or empty string", () => {
    expect(isHoneypotTriggered(undefined)).toBe(false);
    expect(isHoneypotTriggered(null)).toBe(false);
    expect(isHoneypotTriggered("")).toBe(false);
    expect(isHoneypotTriggered("   ")).toBe(false);
  });

  it("is true when a bot filled in any value", () => {
    expect(isHoneypotTriggered("http://spam.example")).toBe(true);
  });

  it("is false for non-string values", () => {
    expect(isHoneypotTriggered(123)).toBe(false);
    expect(isHoneypotTriggered({})).toBe(false);
  });
});
