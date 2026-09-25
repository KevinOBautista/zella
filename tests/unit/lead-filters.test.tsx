import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LeadFilters } from "@/features/leads/components/LeadFilters";
import type { LeadStatus } from "@/features/leads/domain";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const counts = {
  new: 3,
  contacted: 1,
  showing_scheduled: 0,
  interested: 0,
  offer_stage: 0,
  closed: 2,
  not_interested: 0,
} as Record<LeadStatus, number>;

const properties = [{ id: "p1", title: "Maple Road Colonial", address_line_1: "127 Maple Road" }];

describe("LeadFilters", () => {
  it("submits as a GET form so filters live in the URL", () => {
    const { container } = render(
      <LeadFilters search={{ status: "all", view: "board", sort: "newest" }} counts={counts} total={6} properties={properties} />,
    );
    const form = container.querySelector("form")!;
    expect(form.getAttribute("method")).toBe("get");
    expect(form.getAttribute("action")).toBe("/dashboard/leads");
  });

  it("searches by buyer name and contact fields", () => {
    render(<LeadFilters search={{ status: "all", view: "board", sort: "newest" }} counts={counts} total={6} properties={properties} />);
    expect(screen.getByLabelText(/search/i)).toHaveAttribute("name", "q");
  });

  it("offers a property filter built from the seller's own properties", () => {
    render(<LeadFilters search={{ status: "all", view: "board", sort: "newest" }} counts={counts} total={6} properties={properties} />);
    const select = screen.getByLabelText(/property/i);
    expect(select).toHaveAttribute("name", "property");
    expect(screen.getByRole("option", { name: "Maple Road Colonial" })).toBeInTheDocument();
  });

  it("makes every status reachable with its count, closed included", () => {
    render(<LeadFilters search={{ status: "all", view: "board", sort: "newest" }} counts={counts} total={6} properties={properties} />);
    expect(screen.getByRole("link", { name: /All 6/ })).toHaveAttribute("href", "/dashboard/leads");
    expect(screen.getByRole("link", { name: /Closed 2/ })).toHaveAttribute("href", "/dashboard/leads?status=closed");
    expect(screen.getByRole("link", { name: /Not Interested 0/ })).toBeInTheDocument();
  });

  it("marks the applied status as current", () => {
    render(<LeadFilters search={{ status: "closed", view: "board", sort: "newest" }} counts={counts} total={2} properties={properties} />);
    expect(screen.getByRole("link", { name: /Closed 2/ })).toHaveAttribute("aria-current", "page");
  });

  it("offers a mobile status selector carrying the same counts", () => {
    render(<LeadFilters search={{ status: "all", view: "board", sort: "newest" }} counts={counts} total={6} properties={properties} />);
    const select = screen.getByLabelText(/status/i);
    expect(select).toHaveAttribute("name", "status");
    expect(screen.getByRole("option", { name: /Closed \(2\)/ })).toBeInTheDocument();
  });

  it("toggles between the board and the list view", () => {
    render(<LeadFilters search={{ status: "all", view: "board", sort: "newest" }} counts={counts} total={6} properties={properties} />);
    expect(screen.getByRole("link", { name: /list/i })).toHaveAttribute("href", "/dashboard/leads?view=list");
  });

  it("shows Clear filters only when a filter is applied", () => {
    const { unmount } = render(
      <LeadFilters search={{ status: "all", view: "board", sort: "newest" }} counts={counts} total={6} properties={properties} />,
    );
    expect(screen.queryByRole("link", { name: /clear filters/i })).not.toBeInTheDocument();
    unmount();
    render(
      <LeadFilters search={{ status: "closed", q: "ana", view: "board", sort: "newest" }} counts={counts} total={2} properties={properties} />,
    );
    expect(screen.getByRole("link", { name: /clear filters/i })).toHaveAttribute("href", "/dashboard/leads");
  });
});
