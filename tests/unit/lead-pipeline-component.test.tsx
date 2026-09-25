import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { LeadPipeline } from "@/features/dashboard/components/LeadPipeline";
import type { LeadCardData } from "@/features/leads/components/LeadPreviewCard";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/features/leads/actions", () => ({ updateLeadStatusAction: vi.fn() }));

function lead(id: string, lead_status: string, first_name = "Ana"): LeadCardData {
  return {
    id,
    first_name,
    last_name: "Ruiz",
    created_at: "2026-09-01T15:00:00Z",
    lead_status,
    message: null,
    property_id: "p1",
    property_title: "Maple Road Colonial",
    property_cover_path: null,
  };
}

describe("LeadPipeline (Overview preview)", () => {
  it("is titled Lead Pipeline rather than New Leads", () => {
    render(<LeadPipeline leads={[lead("a", "new")]} total={1} previewLimit={3} />);
    expect(screen.getByRole("heading", { name: "Lead Pipeline" })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "New Leads" })).not.toBeInTheDocument();
  });

  it("keeps categorized leads visible instead of showing only new ones", () => {
    render(<LeadPipeline leads={[lead("a", "contacted", "Bo"), lead("b", "offer_stage", "Cy")]} total={2} previewLimit={3} />);
    expect(screen.getByText("Bo Ruiz")).toBeInTheDocument();
    expect(screen.getByText("Cy Ruiz")).toBeInTheDocument();
  });

  it("keeps closed and not-interested categories reachable with labels and counts", () => {
    render(<LeadPipeline leads={[lead("a", "closed", "Zoe")]} total={1} previewLimit={3} />);
    const closed = screen.getByRole("group", { name: /^Closed 1$/ });
    expect(closed).toBeInTheDocument();
    expect(within(closed).getByText("Zoe Ruiz")).toBeInTheDocument();
  });

  it("counts the full dataset while previewing only the limit", () => {
    const many = Array.from({ length: 5 }, (_, i) => lead(`n${i}`, "new", `Buyer${i}`));
    render(<LeadPipeline leads={many} total={5} previewLimit={2} />);
    const section = screen.getByRole("region", { name: /^New 5$/ });
    expect(within(section).getAllByRole("article")).toHaveLength(2);
    expect(within(section).getByRole("link", { name: /view all 5/i })).toHaveAttribute("href", "/dashboard/leads?status=new");
  });

  it("links each category to Leads with that status applied", () => {
    render(<LeadPipeline leads={[lead("a", "contacted")]} total={1} previewLimit={3} />);
    const section = screen.getByRole("region", { name: /^Contacted 1$/ });
    expect(within(section).getByRole("link", { name: /view all/i })).toHaveAttribute("href", "/dashboard/leads?status=contacted");
  });

  it("shows a per-category empty state, not the global one, when a status is empty", () => {
    render(<LeadPipeline leads={[lead("a", "new")]} total={1} previewLimit={3} />);
    const contacted = screen.getByRole("region", { name: /^Contacted 0$/ });
    expect(within(contacted).getByText(/no leads/i)).toBeInTheDocument();
    expect(screen.queryByText(/No buyer inquiries yet/)).not.toBeInTheDocument();
  });

  it("shows the global empty state only when there are no inquiries at all", () => {
    render(<LeadPipeline leads={[]} total={0} previewLimit={3} sellerUsername="maple_seller" />);
    expect(screen.getByText(/No buyer inquiries yet/)).toBeInTheDocument();
  });
});
