import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { LeadCountsByStatus } from "@/features/leads/components/LeadCountsByStatus";

const counts = {
  new: 2,
  contacted: 1,
  showing_scheduled: 0,
  interested: 0,
  offer_stage: 0,
  closed: 3,
  not_interested: 0,
};

describe("LeadCountsByStatus", () => {
  it("shows every status, closed included, scoped to the property", () => {
    render(<LeadCountsByStatus propertyId="p1" counts={counts} />);
    expect(screen.getByRole("link", { name: /Closed 3/ })).toHaveAttribute(
      "href",
      "/dashboard/leads?status=closed&property=p1",
    );
    expect(screen.getByRole("link", { name: /Not Interested 0/ })).toBeInTheDocument();
  });

  it("links the total to the full Leads page with the property filter applied", () => {
    render(<LeadCountsByStatus propertyId="p1" counts={counts} />);
    expect(screen.getByRole("link", { name: /All 6 leads/ })).toHaveAttribute("href", "/dashboard/leads?property=p1");
  });

  it("says so plainly when a property has no inquiries", () => {
    render(
      <LeadCountsByStatus
        propertyId="p1"
        counts={{ new: 0, contacted: 0, showing_scheduled: 0, interested: 0, offer_stage: 0, closed: 0, not_interested: 0 }}
      />,
    );
    expect(screen.getByText(/no inquiries for this property yet/i)).toBeInTheDocument();
  });
});
