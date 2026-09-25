// @vitest-environment node
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildFixtureRows } from "@scripts/db/fixture-rows";

const NOW = new Date("2026-09-16T15:00:00Z");
const rows = buildFixtureRows(NOW, ["hardwood-floors", "fireplace", "updated-kitchen", "finished-basement", "walk-in-closet", "laundry-room", "garage", "driveway", "backyard", "patio", "deck", "pool", "central-air", "solar", "smart-home-features", "accessibility-features"]);

describe("development fixture rows", () => {
  it("recreates the original fixture shape", () => {
    expect(rows.users).toHaveLength(10);
    expect(rows.sellers).toHaveLength(6);
    expect(rows.properties).toHaveLength(16);
    expect(rows.images).toHaveLength(79);
    expect(rows.openHouses).toHaveLength(3);
    expect(rows.rsvps).toHaveLength(9);
    expect(rows.inquiries).toHaveLength(4);
    expect(rows.follows).toHaveLength(3);
    expect(rows.saves).toHaveLength(3);
    expect(rows.leadNotes).toHaveLength(1);
    expect(rows.leadActivity).toHaveLength(1);
    expect(rows.reports).toHaveLength(1);
    expect(new Set(rows.properties.map((p) => p.listing_status))).toEqual(new Set(["for_sale", "coming_soon", "under_contract", "sold", "paused", "draft"]));
  });

  it("is deterministic", () => {
    expect(buildFixtureRows(NOW, ["garage"]).properties.map((p) => p.id)).toEqual(rows.properties.map((p) => p.id));
  });

  it("has consistent relationships", () => {
    const users = new Set(rows.users.map((u) => u.id));
    const sellers = new Map(rows.sellers.map((s) => [s.id, s]));
    const properties = new Map(rows.properties.map((p) => [p.id, p]));
    for (const s of rows.sellers) expect(users.has(s.user_id)).toBe(true);
    for (const p of rows.properties) expect(sellers.has(p.seller_id)).toBe(true);
    for (const i of rows.images) expect(properties.has(i.property_id)).toBe(true);
    for (const o of rows.openHouses) {
      expect(properties.get(o.property_id)!.seller_id).toBe(o.seller_id);
      expect(properties.get(o.property_id)!.address_visibility).toBe("full");
    }
    const ohIds = new Set(rows.openHouses.map((o) => o.id));
    for (const r of rows.rsvps) expect(ohIds.has(r.open_house_id)).toBe(true);
    for (const q of rows.inquiries) expect(properties.get(q.property_id)!.seller_id).toBe(q.seller_id);
    for (const cover of rows.properties.map((p) => rows.images.filter((i) => i.property_id === p.id && i.is_cover))) expect(cover).toHaveLength(1);
  });

  it("contains no personal data, real contacts or credentials", () => {
    const text = JSON.stringify(rows) + readFileSync(path.resolve(import.meta.dirname, "../../supabase/fixtures/dev/data.ts"), "utf8");
    expect(text).not.toMatch(/bautista|kevin|gmail|yahoo|hotmail|password/i);
    const emails = text.match(/[\w.+-]+@[\w.-]+\.\w+/g) ?? [];
    for (const e of emails) expect(e).toMatch(/@(dev\.zella\.test|example\.test)$/);
    expect(text).not.toMatch(/\b\d{3}[-. ]\d{3}[-. ]\d{4}\b/);
    for (const p of rows.properties) expect(p.address_line_1).toMatch(/Fixture|Sample|Placeholder|Example|Test|Mock/);
  });

  it("never marks fixtures as public demo content", () => {
    for (const r of [...rows.sellers, ...rows.properties, ...rows.images, ...rows.openHouses]) {
      expect(r).not.toHaveProperty("is_demo");
    }
  });
});
