import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ExplorePageHeader } from "@/components/shared/ExplorePageHeader";

describe("ExplorePageHeader", () => {
  it("renders the title with the Explore heading treatment", () => {
    render(<ExplorePageHeader title="Open Houses" />);
    const heading = screen.getByRole("heading", { level: 1, name: "Open Houses" });
    expect(heading).toHaveClass("text-4xl", "font-light", "leading-[1.05]", "tracking-tight", "sm:text-5xl");
  });

  it("renders the subtitle when provided", () => {
    render(<ExplorePageHeader title="Discover Sellers" subtitle="Find local sellers and explore their properties." />);
    expect(screen.getByText("Find local sellers and explore their properties.")).toBeInTheDocument();
  });

  it("omits the subtitle paragraph when none is given", () => {
    render(<ExplorePageHeader title="Open Houses" />);
    expect(screen.queryByText(/./, { selector: "p" })).not.toBeInTheDocument();
  });
});
