import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";

const pathname = vi.fn(() => "/dashboard/leads");
vi.mock("next/navigation", () => ({ usePathname: () => pathname(), useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/features/auth/actions", () => ({ signOutAction: vi.fn() }));

function sidebar(over: Partial<React.ComponentProps<typeof DashboardSidebar>> = {}) {
  return <DashboardSidebar displayName="Maple Seller" username="maple_seller" initial="M" {...over} />;
}

describe("DashboardSidebar", () => {
  it("keeps every labeled destination", () => {
    render(sidebar());
    for (const [label, href] of [
      ["Overview", "/dashboard"],
      ["Properties", "/dashboard/properties"],
      ["Leads", "/dashboard/leads"],
      ["Open Houses", "/dashboard/open-houses"],
      ["Profile", "/dashboard/profile"],
      ["Notifications", "/dashboard/notifications"],
      ["Settings", "/dashboard/settings"],
      ["View Public Profile", "/@maple_seller"],
    ] as const) {
      expect(screen.getByRole("link", { name: label })).toHaveAttribute("href", href);
    }
  });

  it("shows the seller's name and @username", () => {
    render(sidebar());
    expect(screen.getByText("Maple Seller")).toBeInTheDocument();
    expect(screen.getByText("@maple_seller")).toBeInTheDocument();
  });

  it("marks the current page with aria-current", () => {
    render(sidebar());
    expect(screen.getByRole("link", { name: "Leads" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current");
  });

  it("does not mark Overview as current on a nested dashboard route", () => {
    render(sidebar());
    expect(screen.getByRole("link", { name: "Overview" })).not.toHaveAttribute("aria-current", "page");
  });

  it("keeps buyer capabilities reachable through the account menu", async () => {
    const userEvent = (await import("@testing-library/user-event")).default;
    const user = userEvent.setup();
    render(sidebar());
    await user.click(screen.getByRole("button", { name: /account menu/i }));
    expect(screen.getByRole("menuitem", { name: "Saved Homes" })).toHaveAttribute("href", "/account/saved");
    expect(screen.getByRole("menuitem", { name: "Following" })).toHaveAttribute("href", "/account/following");
    expect(screen.getByRole("menuitem", { name: "My RSVPs" })).toHaveAttribute("href", "/account/rsvps");
  });

  it("calls onNavigate when a destination is chosen, so a drawer can close", async () => {
    const userEvent = (await import("@testing-library/user-event")).default;
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(sidebar({ onNavigate }));
    await user.click(screen.getByRole("link", { name: "Properties" }));
    expect(onNavigate).toHaveBeenCalled();
  });
});
