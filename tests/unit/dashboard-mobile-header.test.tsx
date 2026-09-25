import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DashboardMobileHeader } from "@/components/layout/DashboardMobileHeader";

vi.mock("next/navigation", () => ({ usePathname: () => "/dashboard", useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/features/auth/actions", () => ({ signOutAction: vi.fn() }));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  });
});

function header() {
  return <DashboardMobileHeader displayName="Maple Seller" username="maple_seller" initial="M" />;
}

describe("DashboardMobileHeader", () => {
  it("opens the navigation in a modal drawer", async () => {
    const user = userEvent.setup();
    render(header());
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /open dashboard menu/i }));
    const dialog = screen.getByRole("dialog", { name: /menu/i });
    expect(dialog).toHaveAttribute("open");
    expect(screen.getByRole("link", { name: "Leads" })).toBeInTheDocument();
  });

  it("closes on Escape", async () => {
    const user = userEvent.setup();
    render(header());
    await user.click(screen.getByRole("button", { name: /open dashboard menu/i }));
    // jsdom implements neither <dialog>'s native `cancel` event nor its
    // focus behavior, so the key goes to the dialog directly — the same
    // keydown handler the browser reaches.
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("closes when a destination is chosen", async () => {
    const user = userEvent.setup();
    render(header());
    await user.click(screen.getByRole("button", { name: /open dashboard menu/i }));
    await user.click(screen.getByRole("link", { name: "Properties" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
