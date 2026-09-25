import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { EmptyState } from "@/components/shared/EmptyState";

describe("EmptyState", () => {
  it("keeps the roomy default padding", () => {
    const { container } = render(<EmptyState title="Nothing here" />);
    expect(container.firstElementChild?.className).toContain("py-16");
  });

  it("uses compact padding when size is compact", () => {
    const { container } = render(<EmptyState size="compact" title="Nothing here" />);
    expect(container.firstElementChild?.className).toContain("py-6");
    expect(container.firstElementChild?.className).not.toContain("py-16");
  });

  it("still renders actions", () => {
    render(<EmptyState size="compact" title="Nothing" actionLabel="Add" actionHref="/add" />);
    expect(screen.getByRole("link", { name: "Add" })).toHaveAttribute("href", "/add");
  });
});
