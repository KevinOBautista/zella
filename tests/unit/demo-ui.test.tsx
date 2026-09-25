import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/features/saves/actions", () => ({ toggleSaveAction: vi.fn() }));
vi.mock("@/features/follows/actions", () => ({ toggleFollowAction: vi.fn() }));
vi.mock("@/features/leads/actions", () => ({ submitInquiryAction: vi.fn() }));
vi.mock("@/features/open-houses/actions", () => ({ submitRsvpAction: vi.fn() }));
vi.mock("@/lib/turnstile/useTurnstile", () => ({ useTurnstile: () => ({ token: null, widget: null }) }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

import { toast } from "sonner";
import { toggleSaveAction } from "@/features/saves/actions";
import { toggleFollowAction } from "@/features/follows/actions";
import { submitInquiryAction } from "@/features/leads/actions";
import { submitRsvpAction } from "@/features/open-houses/actions";
import { PropertyCard, type PropertyCardData } from "@/features/properties/components/PropertyCard";
import { FeaturedListing } from "@/features/properties/components/explore/FeaturedListing";
import { SellerCard, type SellerCardData } from "@/features/sellers/components/SellerCard";
import { SaveButton } from "@/features/saves/components/SaveButton";
import { FollowButton } from "@/features/follows/components/FollowButton";
import { ContactSellerDialog } from "@/features/leads/components/ContactSellerDialog";
import { RSVPDialog } from "@/features/open-houses/components/RSVPDialog";
import { OpenHouseBadge } from "@/features/open-houses/components/OpenHouseBadge";
import { PropertyGallery } from "@/features/properties/components/PropertyGallery";
import { resultsSummary } from "@/features/properties/components/explore/ResultsHeader";
import { DEMO_COPY } from "@/features/demo/constants";

function card(over: Partial<PropertyCardData> = {}): PropertyCardData {
  return {
    id: "p1",
    slug: "demo-kenmore-colonial",
    listing_status: "coming_soon",
    asking_price_cents: null,
    expected_price_min_cents: 25_000_000,
    expected_price_max_cents: 27_000_000,
    pricing_type: "expected_range",
    sold_price_cents: null,
    display_line: "Kenmore, NY 14217",
    bedrooms: 3,
    full_bathrooms: 1,
    half_bathrooms: 1,
    square_feet: 1480,
    cover_image_path: "demo/x/cover.webp",
    has_upcoming_open_house: true,
    seller_id: "s1",
    seller_username: "demo.jordanellery",
    seller_display_name: "Jordan Ellery",
    address_visibility: "city_zip",
    is_demo: true,
    ...over,
  };
}

const seller = (over: Partial<SellerCardData> = {}): SellerCardData => ({
  id: "s1",
  username: "demo.harborline",
  display_name: "Harborline Sample Homes",
  profile_image_path: null,
  city: "Buffalo",
  state: "NY",
  follower_count: 0,
  for_sale_count: 2,
  coming_soon_count: 1,
  has_upcoming_open_house: true,
  is_demo: true,
  ...over,
});

beforeEach(() => vi.clearAllMocks());

describe("Demo badge", () => {
  it("appears on property cards next to the listing status", () => {
    render(<PropertyCard property={card()} />);
    expect(screen.getByText("Demo")).toBeInTheDocument();
    expect(screen.getByText("COMING SOON")).toBeInTheDocument();
  });

  it("is absent on real property cards", () => {
    render(<PropertyCard property={card({ is_demo: false })} />);
    expect(screen.queryByText("Demo")).not.toBeInTheDocument();
  });

  it("appears on open-house cards together with the demo event notice", () => {
    render(<PropertyCard property={card()} openHouseEvent={{ id: "oh1", startsAt: "2026-09-17T21:00:00Z", endsAt: "2026-09-17T23:00:00Z" }} />);
    expect(screen.getByText("Demo")).toBeInTheDocument();
    expect(screen.getByText(DEMO_COPY.eventNotice)).toBeInTheDocument();
  });

  it("keeps the demo event notice next to the compact open-house line", () => {
    render(<PropertyCard property={card({ nextOpenHouse: { starts_at: "2026-09-17T21:00:00Z", ends_at: "2026-09-17T23:00:00Z" } })} />);
    expect(screen.getByText(DEMO_COPY.eventNotice)).toBeInTheDocument();
  });

  it("appears on the featured listing", () => {
    render(<FeaturedListing property={card()} isSaved={false} isLoggedIn={false} />);
    expect(screen.getByText("Demo")).toBeInTheDocument();
  });

  it("appears on seller cards, which label counts as sample inventory and hide followers", () => {
    render(<SellerCard seller={seller()} />);
    expect(screen.getByText("Demo")).toBeInTheDocument();
    expect(screen.getByText(/2 sample for sale · 1 sample coming soon/)).toBeInTheDocument();
    expect(screen.queryByText(/followers/)).not.toBeInTheDocument();
  });

  it("leaves real seller cards unchanged", () => {
    render(<SellerCard seller={seller({ is_demo: false, follower_count: 4 })} />);
    expect(screen.queryByText("Demo")).not.toBeInTheDocument();
    expect(screen.getByText("2 for sale · 1 coming soon · 4 followers")).toBeInTheDocument();
  });

  it("labels demo open-house badges", () => {
    render(<OpenHouseBadge startsAt="2026-09-20T17:00:00Z" endsAt="2026-09-20T19:00:00Z" isDemo />);
    expect(screen.getByText(/DEMO/)).toBeInTheDocument();
  });
});

describe("demo interactions explain instead of acting", () => {
  it("Save explains and never calls the action, even for guests", async () => {
    const user = userEvent.setup();
    render(<SaveButton propertyId="p1" initialSaved={false} isLoggedIn={false} isDemo />);
    await user.click(screen.getByRole("button", { name: /save home/i }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(DEMO_COPY.saveBody)).toBeInTheDocument();
    expect(toggleSaveAction).not.toHaveBeenCalled();
    expect(push).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: /save home/i })).toHaveAttribute("aria-pressed", "false");
  });

  it("Follow explains and never calls the action", async () => {
    const user = userEvent.setup();
    render(<FollowButton sellerId="s1" initialFollowing={false} isLoggedIn isDemo />);
    await user.click(screen.getByRole("button", { name: "Follow" }));
    expect(within(screen.getByRole("dialog")).getByText(DEMO_COPY.followBody)).toBeInTheDocument();
    expect(toggleFollowAction).not.toHaveBeenCalled();
    expect(screen.queryByRole("button", { name: "Following" })).not.toBeInTheDocument();
  });

  it("Contact Seller shows the demo explanation without a form", async () => {
    const user = userEvent.setup();
    render(<ContactSellerDialog sellerId="s1" fixedPropertyId="p1" isLoggedIn={false} isDemo />);
    await user.click(screen.getByRole("button", { name: "Contact Seller" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(DEMO_COPY.contactBody)).toBeInTheDocument();
    expect(within(dialog).queryByRole("textbox")).not.toBeInTheDocument();
    expect(submitInquiryAction).not.toHaveBeenCalled();
  });

  it("RSVP shows the demo explanation without a form or confirmation", async () => {
    const user = userEvent.setup();
    render(<RSVPDialog openHouseId="oh1" startsAt="2026-09-17T21:00:00Z" endsAt="2026-09-17T23:00:00Z" addressLine="Kenmore, NY" isDemo />);
    await user.click(screen.getByRole("button", { name: "RSVP" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(DEMO_COPY.rsvpBody)).toBeInTheDocument();
    expect(within(dialog).queryByRole("textbox")).not.toBeInTheDocument();
    expect(within(dialog).queryByText(/registered/i)).not.toBeInTheDocument();
    expect(submitRsvpAction).not.toHaveBeenCalled();
  });

  it("real Save still calls the action", async () => {
    vi.mocked(toggleSaveAction).mockResolvedValue({ saved: true });
    const user = userEvent.setup();
    render(<SaveButton propertyId="p1" initialSaved={false} isLoggedIn />);
    await user.click(screen.getByRole("button", { name: /save home/i }));
    expect(toggleSaveAction).toHaveBeenCalledWith("p1");
  });

  it("shows the demo message if the server rejects a save as demo content", async () => {
    vi.mocked(toggleSaveAction).mockResolvedValue({ error: DEMO_COPY.actionError, demo: true });
    const user = userEvent.setup();
    render(<SaveButton propertyId="p1" initialSaved={false} isLoggedIn />);
    await user.click(screen.getByRole("button", { name: /save home/i }));
    expect(toast.error).toHaveBeenCalledWith(DEMO_COPY.actionError);
    expect(toast.success).not.toHaveBeenCalled();
  });
});

describe("gallery labeling", () => {
  const images = [
    { src: "https://example.test/a.webp", alt: "Front of the home", credit: "AI-generated illustrative image" },
    { src: "https://example.test/b.webp", alt: "Kitchen", credit: "AI-generated illustrative image" },
  ];

  it("labels demo galleries as illustrative and shows the credit once", () => {
    render(<PropertyGallery images={images} isDemo />);
    const label = screen.getByText((_, el) => el?.tagName === "P" && (el.textContent ?? "").startsWith(DEMO_COPY.galleryLabel));
    expect(label).toHaveTextContent("Illustrative photos for a demo listing. AI-generated illustrative images.");
    expect(screen.getAllByText(/AI-generated illustrative images?/)).toHaveLength(1);
  });

  it("anchors the show-all button inside the gallery frame", () => {
    render(<PropertyGallery images={images} />);
    const frame = screen.getByRole("button", { name: /show all photos/i }).parentElement!;
    expect(frame).toHaveClass("relative");
    expect(frame).toContainElement(screen.getByRole("img", { name: "Front of the home" }));
  });

  it("does not label real galleries", () => {
    render(<PropertyGallery images={images.map((i) => ({ ...i, credit: null }))} />);
    expect(screen.queryByText(/Illustrative photos/)).not.toBeInTheDocument();
  });
});

describe("resultsSummary with demo content", () => {
  it("separates real and demo counts", () => {
    expect(resultsSummary(10, 1, 24, 8)).toBe("2 homes · 8 demo listings");
    expect(resultsSummary(1, 1, 24, 1)).toBe("1 demo listing");
    expect(resultsSummary(3, 1, 24, 0)).toBe("Showing 1–3 of 3 homes");
  });

  it("keeps pagination wording for large result sets", () => {
    expect(resultsSummary(60, 2, 24, 8)).toBe("Showing 25–48 of 60 results · 52 homes · 8 demo listings");
  });
});
