import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ListingStatusBadge } from "@/features/properties/components/ListingStatusBadge";

describe("ListingStatusBadge", () => {
  it("renders For Sale as a solid black/charcoal badge with white text", () => {
    render(<ListingStatusBadge status="for_sale" />);
    const badge = screen.getByText("FOR SALE");
    expect(badge.className).toContain("bg-[var(--color-accent)]");
    expect(badge.className).toContain("text-[var(--color-accent-foreground)]");
  });

  it("renders Coming Soon as a gray badge", () => {
    render(<ListingStatusBadge status="coming_soon" />);
    const badge = screen.getByText("COMING SOON");
    expect(badge.className).toContain("bg-[var(--color-accent-soft)]");
  });

  it("renders Sold in red", () => {
    render(<ListingStatusBadge status="sold" />);
    const badge = screen.getByText("SOLD");
    expect(badge.className).toContain("var(--color-danger");
  });

  it("gives other statuses a distinguishable neutral treatment", () => {
    render(<ListingStatusBadge status="under_contract" />);
    const badge = screen.getByText("UNDER CONTRACT");
    expect(badge.className).toContain("bg-[var(--color-background)]");
    expect(badge.className).toContain("border");
    // Distinct from the solid-gray Coming Soon fill, so status is never
    // carried by color alone.
    expect(badge.className).not.toContain("bg-[var(--color-accent-soft)]");
  });

  it("never uses the green-era accent-soft text pairing for sold", () => {
    render(<ListingStatusBadge status="sold" />);
    expect(screen.getByText("SOLD").className).not.toContain("bg-[var(--color-accent-soft)]");
  });

  it("renders an explicit text label for every supported status", () => {
    for (const [status, label] of [
      ["for_sale", "FOR SALE"],
      ["coming_soon", "COMING SOON"],
      ["under_contract", "UNDER CONTRACT"],
      ["sold", "SOLD"],
    ] as const) {
      const { unmount } = render(<ListingStatusBadge status={status} />);
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });

  it("renders nothing without a status", () => {
    const { container } = render(<ListingStatusBadge status={null} />);
    expect(container).toBeEmptyDOMElement();
  });
});
