import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { PageHeader } from "@/components/shared/PageHeader";

describe("PageHeader", () => {
  it("renders the title as an h1 with the explore heading style", () => {
    render(<PageHeader title="Your Properties" />);
    const h1 = screen.getByRole("heading", { level: 1, name: "Your Properties" });
    expect(h1.className).toContain("font-light");
  });

  it("renders an optional description and action", () => {
    render(<PageHeader title="Leads" description="Buyer inquiries." action={<button type="button">Add</button>} />);
    expect(screen.getByText("Buyer inquiries.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });
});
