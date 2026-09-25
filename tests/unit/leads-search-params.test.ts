import { describe, expect, it } from "vitest";
import { buildLeadsHref, escapeSearch, parseLeadsSearchParams } from "@/features/leads/search-params";

describe("buildLeadsHref", () => {
  it("drops empty params", () => {
    expect(buildLeadsHref({})).toBe("/dashboard/leads");
    expect(buildLeadsHref({ status: "all", q: "", property: undefined })).toBe("/dashboard/leads");
  });

  it("keeps the filters that are set", () => {
    expect(buildLeadsHref({ status: "closed", property: "p1" })).toBe("/dashboard/leads?status=closed&property=p1");
  });

  it("applies overrides over the base search", () => {
    expect(buildLeadsHref({ status: "new", q: "ana" }, { status: "closed" })).toBe("/dashboard/leads?status=closed&q=ana");
  });

  it("clears a param when the override is null", () => {
    expect(buildLeadsHref({ status: "new", q: "ana" }, { q: null })).toBe("/dashboard/leads?status=new");
  });

  it("encodes values", () => {
    expect(buildLeadsHref({ q: "a b&c" })).toBe("/dashboard/leads?q=a+b%26c");
  });
});

describe("parseLeadsSearchParams", () => {
  it("defaults to all statuses and the board view", () => {
    expect(parseLeadsSearchParams({})).toEqual({ status: "all", property: undefined, q: undefined, view: "board", sort: "newest" });
  });

  it("rejects unknown statuses, views and sorts", () => {
    const parsed = parseLeadsSearchParams({ status: "bogus", view: "grid", sort: "sideways" });
    expect(parsed.status).toBe("all");
    expect(parsed.view).toBe("board");
    expect(parsed.sort).toBe("newest");
  });

  it("keeps a real status, list view and oldest sort", () => {
    const parsed = parseLeadsSearchParams({ status: "closed", view: "list", sort: "oldest", q: " ana ", property: "p1" });
    expect(parsed).toEqual({ status: "closed", property: "p1", q: "ana", view: "list", sort: "oldest" });
  });

  it("treats an empty search string as no search", () => {
    expect(parseLeadsSearchParams({ q: "   " }).q).toBeUndefined();
  });
});

describe("escapeSearch", () => {
  it("leaves an ordinary name untouched", () => {
    expect(escapeSearch("Ana Ruiz")).toBe("Ana Ruiz");
  });

  it("strips the characters PostgREST treats as or= syntax", () => {
    expect(escapeSearch("ana,last_name.ilike.*")).toBe("ana last_name.ilike.*");
    expect(escapeSearch("a(b)c")).toBe("a b c");
    expect(escapeSearch("a\\b")).toBe("a b");
  });

  it("collapses the whitespace it introduces and trims", () => {
    expect(escapeSearch("  a,,b  ")).toBe("a b");
  });
});
