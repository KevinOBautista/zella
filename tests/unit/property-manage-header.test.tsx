import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { PropertyManageHeader } from "@/features/properties/components/PropertyManageHeader";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

const base = {
  propertyId: "p1",
  title: "Maple Road Colonial",
  displayLine: "127 Maple Road, Amherst, NY 14226",
  listingStatus: "for_sale" as const,
  price: "$300,000",
  coverImagePath: "cover.jpg",
  addressHiddenPublicly: false,
  publicUrl: "https://example.test/homes/maple",
};

describe("PropertyManageHeader", () => {
  it("shows title, address, status and price over the photo", () => {
    render(<PropertyManageHeader {...base} />);
    expect(screen.getByRole("heading", { level: 1, name: "Maple Road Colonial" })).toBeInTheDocument();
    expect(screen.getByText("127 Maple Road, Amherst, NY 14226")).toBeInTheDocument();
    expect(screen.getByText("FOR SALE")).toBeInTheDocument();
    expect(screen.getByText("$300,000")).toBeInTheDocument();
  });

  it("keeps a readable scrim behind the overlaid text rather than a text shadow", () => {
    const { container } = render(<PropertyManageHeader {...base} />);
    const scrim = container.querySelector('[data-scrim="true"]');
    expect(scrim).toBeTruthy();
    expect(scrim!.className).toContain("bg-gradient-to-t");
  });

  it("offers Edit Property and the public listing when one exists", () => {
    render(<PropertyManageHeader {...base} />);
    expect(screen.getByRole("link", { name: /edit property/i })).toHaveAttribute("href", "/dashboard/properties/p1/edit?step=1");
    expect(screen.getByRole("link", { name: /view public listing/i })).toHaveAttribute("href", "https://example.test/homes/maple");
  });

  it("omits the public listing action for a draft with no public URL", () => {
    render(<PropertyManageHeader {...base} publicUrl={null} listingStatus="draft" />);
    expect(screen.queryByRole("link", { name: /view public listing/i })).not.toBeInTheDocument();
    expect(screen.getByText("DRAFT")).toBeInTheDocument();
  });

  it("uses the neutral fallback when there is no photograph", () => {
    render(<PropertyManageHeader {...base} coverImagePath={null} />);
    expect(screen.getByText(/photo coming soon/i)).toBeInTheDocument();
  });

  it("states that the address is hidden publicly while still showing it to the seller", () => {
    render(<PropertyManageHeader {...base} addressHiddenPublicly />);
    expect(screen.getByText(/hidden on the public listing/i)).toBeInTheDocument();
    expect(screen.getByText("127 Maple Road, Amherst, NY 14226")).toBeInTheDocument();
  });

  it("shows no price row when the price is not set", () => {
    render(<PropertyManageHeader {...base} price={null} />);
    expect(screen.queryByText(/\$/)).not.toBeInTheDocument();
  });
});
