import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { mainNavLinks, navLinksFor, accountNavItems } from "@/config/nav";
import { sellerCta, type AccountState } from "@/lib/seller-routing";
import { LandingNav } from "@/features/landing/components/LandingNav";

const getViewer = vi.fn();
const getUnreadNotificationCount = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/lib/auth/viewer", () => ({ getViewer: () => getViewer() }));
vi.mock("@/features/notifications/queries", () => ({
  getUnreadNotificationCount: (id: string) => getUnreadNotificationCount(id),
}));
vi.mock("@/features/auth/actions", () => ({ signOutAction: vi.fn() }));

// Imported after the mocks so the server component picks them up.
const { SiteHeader } = await import("@/components/layout/SiteHeader");

function viewer(state: AccountState) {
  return {
    user: state === "guest" ? null : { id: "u1" },
    seller: state === "seller" ? { id: "s1" } : null,
    state,
    initial: "K",
  };
}

async function renderSiteHeader(state: AccountState, unread = 0) {
  getViewer.mockResolvedValue(viewer(state));
  getUnreadNotificationCount.mockResolvedValue(unread);
  return render(await SiteHeader());
}

function renderLandingNav(state: AccountState, unread = 0) {
  return render(<LandingNav state={state} initial="K" cta={sellerCta(state)} unreadCount={unread} />);
}

function primaryHrefs(container: HTMLElement) {
  const nav = within(container).getByRole("navigation", { name: /primary/i });
  return within(nav)
    .getAllByRole("link")
    .map((a) => a.getAttribute("href"));
}

beforeEach(() => {
  getViewer.mockReset();
  getUnreadNotificationCount.mockReset();
});

describe("shared navigation config", () => {
  it("includes Sellers", () => {
    expect(mainNavLinks.map((l) => l.href)).toContain("/sellers");
  });

  it("no longer lists Coming Soon in navigation", () => {
    for (const state of ["guest", "buyer", "seller"] as const) {
      expect(navLinksFor(state).map((l) => l.href)).not.toContain("/coming-soon");
    }
  });

  it("keeps Homes and Open Houses destinations", () => {
    const hrefs = mainNavLinks.map((l) => l.href);
    expect(hrefs).toContain("/homes");
    expect(hrefs).toContain("/open-houses");
  });

  it("points Notifications and Saved Listings at the existing account routes", () => {
    const hrefs = accountNavItems.map((i) => i.href);
    expect(hrefs).toContain("/account/notifications");
    expect(hrefs).toContain("/account/saved");
  });
});

describe("both navbar variants share destinations", () => {
  for (const state of ["guest", "buyer", "seller"] as const) {
    it(`matches primary link hrefs for a ${state}`, async () => {
      const site = await renderSiteHeader(state);
      const siteHrefs = primaryHrefs(site.container);
      site.unmount();

      const landing = renderLandingNav(state);
      expect(primaryHrefs(landing.container)).toEqual(siteHrefs);
      expect(siteHrefs).toContain("/sellers");
    });
  }
});

describe("account-aware behaviour is preserved on both variants", () => {
  it("shows the sign-in action to guests and no account menu", async () => {
    const site = await renderSiteHeader("guest");
    expect(within(site.container).getByRole("link", { name: /log in/i })).toHaveAttribute("href", "/login");
    expect(within(site.container).queryByRole("button", { name: /account menu/i })).not.toBeInTheDocument();
    site.unmount();

    const landing = renderLandingNav("guest");
    expect(within(landing.container).getAllByRole("link", { name: /log in/i })[0]).toHaveAttribute("href", "/login");
    expect(within(landing.container).queryByRole("button", { name: /account menu/i })).not.toBeInTheDocument();
  });

  it("gives signed-in users the account dropdown on both variants", async () => {
    const site = await renderSiteHeader("buyer");
    expect(within(site.container).getByRole("button", { name: /account menu/i })).toBeInTheDocument();
    site.unmount();

    const landing = renderLandingNav("buyer");
    expect(within(landing.container).getByRole("button", { name: /account menu/i })).toBeInTheDocument();
  });

  it("groups Notifications and Saved Listings for signed-in users on both variants", async () => {
    const site = await renderSiteHeader("buyer");
    expect(within(site.container).getByRole("link", { name: /saved/i })).toHaveAttribute("href", "/account/saved");
    expect(within(site.container).getByRole("link", { name: /notifications/i })).toHaveAttribute(
      "href",
      "/account/notifications",
    );
    site.unmount();

    const landing = renderLandingNav("buyer");
    expect(within(landing.container).getAllByRole("link", { name: /saved/i })[0]).toHaveAttribute(
      "href",
      "/account/saved",
    );
    expect(within(landing.container).getAllByRole("link", { name: /notifications/i })[0]).toHaveAttribute(
      "href",
      "/account/notifications",
    );
  });

  it("routes a buyer to seller onboarding and a seller to their properties", async () => {
    const buyer = await renderSiteHeader("buyer");
    expect(within(buyer.container).getByRole("link", { name: /start selling/i })).toHaveAttribute(
      "href",
      "/onboarding",
    );
    buyer.unmount();

    const seller = await renderSiteHeader("seller");
    expect(within(seller.container).getByRole("link", { name: /manage properties/i })).toHaveAttribute(
      "href",
      "/dashboard/properties",
    );
  });

  it("shows the unread notification dot only when there is real unread data", async () => {
    const none = renderLandingNav("buyer", 0);
    expect(within(none.container).queryByText(/unread/i)).not.toBeInTheDocument();
    none.unmount();

    // Surfaced in both the desktop pill and the mobile drawer.
    const some = renderLandingNav("buyer", 3);
    expect(within(some.container).getAllByText(/3 unread/i).length).toBeGreaterThan(0);
  });
});

describe("mobile keeps the same actions", () => {
  it("exposes Notifications and Saved Listings in the landing drawer", async () => {
    const user = userEvent.setup();
    renderLandingNav("buyer");
    await user.click(screen.getByRole("button", { name: /open menu/i }));
    const drawer = screen.getByRole("navigation", { name: /mobile/i });
    const hrefs = within(drawer.parentElement as HTMLElement)
      .getAllByRole("link")
      .map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/account/saved");
    expect(hrefs).toContain("/account/notifications");
  });
});
