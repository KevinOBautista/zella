import { describe, expect, it } from "vitest";
import { formatCents, parseDollarsToCents } from "@/lib/money";

describe("formatCents", () => {
  it("formats whole dollars with thousands separators", () => {
    expect(formatCents(54_900_000)).toBe("$549,000");
  });

  it("formats zero", () => {
    expect(formatCents(0)).toBe("$0");
  });

  it("returns a neutral label for null (price undecided)", () => {
    expect(formatCents(null)).toBe("Price not disclosed");
  });
});

describe("parseDollarsToCents", () => {
  it("parses a plain number string", () => {
    expect(parseDollarsToCents("549000")).toBe(54_900_000);
  });

  it("parses a string with commas and a dollar sign", () => {
    expect(parseDollarsToCents("$549,000")).toBe(54_900_000);
  });

  it("parses cents correctly", () => {
    expect(parseDollarsToCents("549000.50")).toBe(54_900_050);
  });

  it("throws on non-numeric input", () => {
    expect(() => parseDollarsToCents("not a price")).toThrow();
  });

  it("throws on negative input", () => {
    expect(() => parseDollarsToCents("-100")).toThrow();
  });
});
