import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { StatusCountTiles } from "@/features/dashboard/components/StatusCountTiles";

describe("StatusCountTiles", () => {
  it("links each count to the matching Properties tab", () => {
    render(<StatusCountTiles counts={{ for_sale: 2, coming_soon: 1, under_contract: 0, drafts: 4, sold: 3 }} />);
    expect(screen.getByRole("link", { name: /For Sale/ })).toHaveAttribute("href", "/dashboard/properties?tab=for_sale");
    expect(screen.getByRole("link", { name: /Drafts/ })).toHaveAttribute("href", "/dashboard/properties?tab=drafts");
    expect(screen.getByRole("link", { name: /Sold/ })).toHaveAttribute("href", "/dashboard/properties?tab=sold");
  });

  it("shows real counts including zero", () => {
    render(<StatusCountTiles counts={{ for_sale: 2, coming_soon: 1, under_contract: 0, drafts: 4, sold: 3 }} />);
    expect(screen.getByRole("link", { name: /For Sale/ })).toHaveTextContent("2");
    expect(screen.getByRole("link", { name: /Under Contract/ })).toHaveTextContent("0");
  });

  it("carries no percentages or trend claims", () => {
    const { container } = render(<StatusCountTiles counts={{ for_sale: 2, coming_soon: 1, under_contract: 0, drafts: 4, sold: 3 }} />);
    expect(container.textContent).not.toMatch(/%|vs last month|trend/i);
  });
});
