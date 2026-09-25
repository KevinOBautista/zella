import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { LeadPreviewCard, type LeadCardData } from "@/features/leads/components/LeadPreviewCard";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/features/leads/actions", () => ({ updateLeadStatusAction: vi.fn() }));

function lead(over: Partial<LeadCardData> = {}): LeadCardData {
  return {
    id: "i1",
    first_name: "Ana",
    last_name: "Ruiz",
    created_at: "2026-09-01T15:00:00Z",
    lead_status: "new",
    message: "Is the basement finished? I would love to see it this weekend.",
    property_id: "p1",
    property_title: "Maple Road Colonial",
    property_cover_path: null,
    ...over,
  };
}

describe("LeadPreviewCard", () => {
  it("shows the buyer, property, date, message preview and status", () => {
    render(<LeadPreviewCard lead={lead()} />);
    expect(screen.getByText("Ana Ruiz")).toBeInTheDocument();
    expect(screen.getByText("Maple Road Colonial")).toBeInTheDocument();
    expect(screen.getByText(/Is the basement finished/)).toBeInTheDocument();
    expect(screen.getByText("New")).toBeInTheDocument();
  });

  it("links to the lead detail page", () => {
    render(<LeadPreviewCard lead={lead()} />);
    expect(screen.getByRole("link", { name: /Ana Ruiz/ })).toHaveAttribute("href", "/dashboard/leads/i1");
  });

  it("labels an inquiry with no property as a general inquiry", () => {
    render(<LeadPreviewCard lead={lead({ property_id: null, property_title: null })} />);
    expect(screen.getByText("General inquiry")).toBeInTheDocument();
  });

  it("renders without a message and without a thumbnail", () => {
    const { container } = render(<LeadPreviewCard lead={lead({ message: null })} />);
    expect(container.querySelector("img")).toBeNull();
    expect(screen.getByText("Ana Ruiz")).toBeInTheDocument();
  });

  it("keeps the move menu out of the lead link", () => {
    render(<LeadPreviewCard lead={lead()} showMoveMenu />);
    expect(screen.getByRole("button", { name: /move to/i }).closest("a")).toBeNull();
  });
});
