import { describe, expect, it } from "vitest";
import { countLeadsByStatus, groupLeadsByStatus, LEAD_STATUS_TONE } from "@/features/leads/pipeline";
import { LEAD_STATUSES } from "@/features/leads/domain";

type Row = { id: string; lead_status: string };

function lead(id: string, lead_status: string): Row {
  return { id, lead_status };
}

describe("groupLeadsByStatus", () => {
  it("returns every status in pipeline order even when empty", () => {
    const groups = groupLeadsByStatus([], 3);
    expect(groups.map((g) => g.status)).toEqual([...LEAD_STATUSES]);
    expect(groups.every((g) => g.count === 0 && g.leads.length === 0)).toBe(true);
  });

  it("keeps categorized leads visible instead of only new ones", () => {
    const groups = groupLeadsByStatus([lead("a", "new"), lead("b", "closed"), lead("c", "not_interested")], 3);
    const byStatus = Object.fromEntries(groups.map((g) => [g.status, g.count]));
    expect(byStatus.new).toBe(1);
    expect(byStatus.closed).toBe(1);
    expect(byStatus.not_interested).toBe(1);
  });

  it("counts the whole dataset but previews only the limit", () => {
    const rows = Array.from({ length: 7 }, (_, i) => lead(`n${i}`, "new"));
    const [group] = groupLeadsByStatus(rows, 3);
    expect(group!.count).toBe(7);
    expect(group!.leads).toHaveLength(3);
    expect(group!.hasMore).toBe(true);
  });

  it("does not flag hasMore when the category fits inside the limit", () => {
    const [group] = groupLeadsByStatus([lead("a", "new")], 3);
    expect(group!.hasMore).toBe(false);
  });

  it("ignores rows carrying an unknown status rather than dropping them into New", () => {
    const groups = groupLeadsByStatus([lead("a", "bogus" as string), lead("b", "new")], 3);
    expect(groups.find((g) => g.status === "new")!.count).toBe(1);
    expect(groups.reduce((n, g) => n + g.count, 0)).toBe(1);
  });
});

describe("countLeadsByStatus", () => {
  it("zero-fills every status", () => {
    const counts = countLeadsByStatus([lead("a", "contacted")]);
    expect(counts.contacted).toBe(1);
    expect(counts.new).toBe(0);
    expect(Object.keys(counts).sort()).toEqual([...LEAD_STATUSES].sort());
  });
});

describe("LEAD_STATUS_TONE", () => {
  it("covers every status with a restrained badge variant", () => {
    for (const status of LEAD_STATUSES) expect(LEAD_STATUS_TONE[status]).toBeTruthy();
  });
});
