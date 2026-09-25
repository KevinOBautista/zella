/**
 * Money is always stored and passed around as integer cents — never
 * floating-point dollars. These are the only two places
 * that convert to/from a human-readable dollar string.
 */
export function formatCents(cents: number | null, opts?: { currency?: string }): string {
  if (cents === null) return "Price not disclosed";
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: opts?.currency ?? "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(dollars);
}

export function parseDollarsToCents(input: string): number {
  const cleaned = input.replace(/[$,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(cleaned)) {
    throw new Error(`"${input}" is not a valid dollar amount`);
  }
  const value = Number.parseFloat(cleaned);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`"${input}" is not a valid dollar amount`);
  }
  return Math.round(value * 100);
}
