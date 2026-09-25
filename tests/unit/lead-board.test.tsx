import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LeadBoard } from "@/features/leads/components/LeadBoard";
import type { LeadCardData } from "@/features/leads/components/LeadPreviewCard";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
const updateLeadStatusAction = vi.fn();
vi.mock("@/features/leads/actions", () => ({ updateLeadStatusAction: (...a: unknown[]) => updateLeadStatusAction(...a) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

beforeEach(() => updateLeadStatusAction.mockReset());

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

describe("LeadBoard", () => {
  it("renders every status column, including closed and not interested", () => {
    render(<LeadBoard leads={[lead("a", "new")]} />);
    for (const label of ["New", "Contacted", "Showing Scheduled", "Interested", "Offer / Negotiation", "Closed", "Not Interested"]) {
      expect(screen.getByRole("heading", { name: new RegExp(`^${label.replace("/", "\\/")} \\d+$`) })).toBeInTheDocument();
    }
  });

  it("shows only the filtered category's column when a status filter is applied", () => {
    render(<LeadBoard leads={[lead("a", "contacted", "Bo")]} statuses={["contacted"]} />);
    expect(screen.getByRole("heading", { name: /^Contacted 1$/ })).toBeInTheDocument();
    for (const other of ["New", "Showing Scheduled", "Interested", "Offer / Negotiation", "Closed", "Not Interested"]) {
      expect(screen.queryByRole("heading", { name: new RegExp(`^${other.replace("/", "\\/")} \\d+$`) })).not.toBeInTheDocument();
    }
    expect(screen.queryByText(/no leads in this category/i)).not.toBeInTheDocument();
  });

  it("falls back to every column when no status filter is applied", () => {
    render(<LeadBoard leads={[lead("a", "contacted")]} />);
    expect(screen.getByRole("heading", { name: /^New 0$/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Closed 0$/ })).toBeInTheDocument();
  });

  it("wraps every column into view instead of scrolling sideways", () => {
    const { container } = render(<LeadBoard leads={[lead("a", "new")]} />);
    const board = container.firstElementChild!;
    expect(board.className).not.toContain("overflow-x-auto");
    expect(board.className).toContain("grid");
    // No fixed column width, so columns share the row rather than
    // overflowing it.
    for (const column of Array.from(board.children)) {
      expect(column.className).not.toMatch(/\bw-72\b/);
    }
  });

  it("keeps a categorized lead visible in its own column", () => {
    render(<LeadBoard leads={[lead("a", "closed", "Zoe")]} />);
    const closed = screen.getByRole("region", { name: /^Closed \(\d+\)$/ });
    expect(within(closed).getByText("Zoe Ruiz")).toBeInTheDocument();
  });

  it("shows a per-category empty state without claiming there are no inquiries at all", () => {
    render(<LeadBoard leads={[lead("a", "new")]} />);
    const contacted = screen.getByRole("region", { name: /^Contacted \(\d+\)$/ });
    expect(within(contacted).getByText(/no leads/i)).toBeInTheDocument();
    expect(screen.queryByText(/No buyer inquiries yet/)).not.toBeInTheDocument();
  });

  it("moves a lead between columns and updates both counts", async () => {
    const user = userEvent.setup();
    updateLeadStatusAction.mockResolvedValue({ success: true });
    render(<LeadBoard leads={[lead("a", "new")]} />);
    expect(screen.getByRole("heading", { name: /^New 1$/ })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /move to/i }));
    await user.click(screen.getByRole("menuitem", { name: "Contacted" }));

    await waitFor(() => expect(screen.getByRole("heading", { name: /^Contacted 1$/ })).toBeInTheDocument());
    expect(screen.getByRole("heading", { name: /^New 0$/ })).toBeInTheDocument();
    const contacted = screen.getByRole("region", { name: /^Contacted \(\d+\)$/ });
    expect(within(contacted).getByText("Ana Ruiz")).toBeInTheDocument();
    // The record moved — it was never duplicated or dropped.
    expect(screen.getAllByText("Ana Ruiz")).toHaveLength(1);
  });
});
