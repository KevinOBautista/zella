import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  PropertyCard,
  type PropertyCardData,
  type SellerPropertyCardData,
} from "@/features/properties/components/PropertyCard";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/features/saves/actions", () => ({ toggleSaveAction: vi.fn() }));

function card(over: Partial<PropertyCardData> = {}): PropertyCardData {
  return {
    id: "p1",
    slug: "127-maple-road-amherst-ny",
    listing_status: "for_sale",
    asking_price_cents: 30_000_000,
    expected_price_min_cents: null,
    expected_price_max_cents: null,
    pricing_type: "asking_price",
    sold_price_cents: null,
    display_line: "127 Maple Road, Amherst, NY 14226",
    bedrooms: 3,
    full_bathrooms: 2,
    half_bathrooms: null,
    square_feet: 1500,
    cover_image_path: null,
    has_upcoming_open_house: false,
    seller_username: "maple_seller",
    seller_display_name: "Maple Seller",
    address_visibility: "full",
    ...over,
  };
}

describe("PropertyCard", () => {
  it("renders price as the strongest text and links the listing", () => {
    render(<PropertyCard property={card()} />);
    expect(screen.getByText("$300,000")).toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: /\$300,000|View listing/ });
    expect(links.some((l) => l.getAttribute("href") === "/homes/127-maple-road-amherst-ny")).toBe(true);
  });

  it("formats specs, omits missing fields and never shows zero for unknowns", () => {
    render(<PropertyCard property={card({ square_feet: null, half_bathrooms: 1 })} />);
    expect(screen.getByText("3 bd · 2.5 ba")).toBeInTheDocument();
    expect(screen.queryByText(/sqft/)).not.toBeInTheDocument();
    expect(screen.queryByText(/0 bd/)).not.toBeInTheDocument();
  });

  it("omits the specs line entirely when nothing is known", () => {
    render(<PropertyCard property={card({ bedrooms: null, full_bathrooms: null, square_feet: null })} />);
    expect(screen.queryByText(/bd|ba|sqft/)).not.toBeInTheDocument();
  });

  it("links the seller identity to the seller profile with name and @username", () => {
    render(<PropertyCard property={card()} />);
    const seller = screen.getByRole("link", { name: /Maple Seller/ });
    expect(seller).toHaveAttribute("href", "/@maple_seller");
    expect(seller).toHaveTextContent("@maple_seller");
  });

  it("does not nest the Save button inside a link", () => {
    render(<PropertyCard property={card()} />);
    const save = screen.getByRole("button", { name: /save home/i });
    expect(save.closest("a")).toBeNull();
  });

  it("shows the hidden-address note only for non-full visibility", () => {
    const { rerender } = render(
      <PropertyCard property={card({ listing_status: "coming_soon", address_visibility: "city_zip", display_line: "Amherst, NY 14226" })} />,
    );
    expect(screen.getByText("Exact address shared when available.")).toBeInTheDocument();
    expect(screen.queryByText(/Maple Road/)).not.toBeInTheDocument();
    rerender(<PropertyCard property={card({ listing_status: "coming_soon", address_visibility: "full" })} />);
    expect(screen.queryByText("Exact address shared when available.")).not.toBeInTheDocument();
  });

  it("shows the next open house when provided", () => {
    render(<PropertyCard property={card({ nextOpenHouse: { starts_at: "2026-09-20T17:00:00Z", ends_at: "2026-09-20T20:00:00Z" } })} />);
    expect(screen.getByText(/Open house/)).toHaveTextContent("Sun, Sep 20 · 1–4 PM");
  });

  it("renders a neutral placeholder without a photo and keeps alt text empty", () => {
    render(<PropertyCard property={card({ cover_image_path: null })} />);
    expect(screen.getByText(/photo coming soon/i)).toBeInTheDocument();
    expect(screen.queryByRole("img", { name: /Maple/ })).not.toBeInTheDocument();
  });

  it("shows the specific event's date, time and time zone when an openHouseEvent is given", () => {
    render(
      <PropertyCard
        property={card({ nextOpenHouse: { starts_at: "2026-09-27T17:00:00Z", ends_at: "2026-09-27T20:00:00Z" } })}
        openHouseEvent={{ id: "oh1", startsAt: "2026-09-20T17:00:00Z", endsAt: "2026-09-20T20:00:00Z" }}
      />,
    );
    // Shows the given event's own time, not the property's separately-tracked next open house.
    expect(screen.getByText(/Sunday, September 20.*ET/)).toBeInTheDocument();
    expect(screen.queryByText(/September 27/)).not.toBeInTheDocument();
  });

  it("provides a separate View Open House action linking to the listing when an openHouseEvent is given", () => {
    render(<PropertyCard property={card()} openHouseEvent={{ id: "oh1", startsAt: "2026-09-20T17:00:00Z", endsAt: "2026-09-20T20:00:00Z" }} />);
    const action = screen.getByRole("link", { name: /view open house/i });
    expect(action).toHaveAttribute("href", "/homes/127-maple-road-amherst-ny#open-house");
    const save = screen.getByRole("button", { name: /save home/i });
    expect(save.closest("a")).toBeNull();
  });

  it("omits the View Open House action and generic next-open-house line when no openHouseEvent is given", () => {
    render(<PropertyCard property={card()} />);
    expect(screen.queryByRole("link", { name: /view open house/i })).not.toBeInTheDocument();
  });

  it("shows the expected price range for range-priced coming soon listings", () => {
    render(
      <PropertyCard
        property={card({ listing_status: "coming_soon", pricing_type: "expected_range", asking_price_cents: null, expected_price_min_cents: 20_000_000, expected_price_max_cents: 25_000_000 })}
      />,
    );
    expect(screen.getByText("$200,000 – $250,000")).toBeInTheDocument();
  });
});

function sellerCard(over: Partial<SellerPropertyCardData> = {}): SellerPropertyCardData {
  return {
    ...card(),
    slug: "127-maple-road-amherst-ny",
    title: "Maple Road Colonial",
    seller_username: null,
    seller_display_name: null,
    canScheduleOpenHouse: true,
    ...over,
  };
}

describe("PropertyCard — seller variant", () => {
  it("keeps the details beneath the photo and links to the management route", () => {
    render(<PropertyCard variant="seller" property={sellerCard()} />);
    const links = screen.getAllByRole("link").map((l) => l.getAttribute("href"));
    expect(links).toContain("/dashboard/properties/p1");
    expect(links).not.toContain("/homes/127-maple-road-amherst-ny");
    expect(screen.getByText("$300,000")).toBeInTheDocument();
    expect(screen.getByText("3 bd · 2 ba · 1,500 sqft")).toBeInTheDocument();
  });

  it("replaces the Save heart with an overflow menu and drops the seller identity row", () => {
    render(<PropertyCard variant="seller" property={sellerCard()} />);
    expect(screen.queryByRole("button", { name: /save home/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /property actions/i })).toBeInTheDocument();
    expect(screen.queryByText(/@maple_seller/)).not.toBeInTheDocument();
  });

  it("keeps the overflow menu outside any link so opening it does not navigate", () => {
    render(<PropertyCard variant="seller" property={sellerCard()} />);
    expect(screen.getByRole("button", { name: /property actions/i }).closest("a")).toBeNull();
  });

  it("keeps the menu clear of the photo's clipping container so the dropdown is not cut off", async () => {
    const user = userEvent.setup();
    const { container } = render(<PropertyCard variant="seller" property={sellerCard()} />);
    await user.click(screen.getByRole("button", { name: /property actions/i }));
    const menu = screen.getByRole("menu");
    for (let el = menu.parentElement; el && el !== container; el = el.parentElement) {
      expect(el.className).not.toContain("overflow-hidden");
    }
  });

  it("shows a visible Manage Property action beneath the details", () => {
    render(<PropertyCard variant="seller" property={sellerCard()} />);
    expect(screen.getByRole("link", { name: /manage property/i })).toHaveAttribute("href", "/dashboard/properties/p1");
  });

  it("offers the public listing only when a public listing exists", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<PropertyCard variant="seller" property={sellerCard()} />);
    await user.click(screen.getByRole("button", { name: /property actions/i }));
    expect(screen.getByRole("menuitem", { name: /view public listing/i })).toHaveAttribute(
      "href",
      "/homes/127-maple-road-amherst-ny",
    );
    unmount();

    render(<PropertyCard variant="seller" property={sellerCard({ slug: null, listing_status: "draft" })} />);
    await user.click(screen.getByRole("button", { name: /property actions/i }));
    expect(screen.queryByRole("menuitem", { name: /view public listing/i })).not.toBeInTheDocument();
  });

  it("offers edit and photo management, and open-house scheduling only when allowed", async () => {
    const user = userEvent.setup();
    const { unmount } = render(<PropertyCard variant="seller" property={sellerCard()} />);
    await user.click(screen.getByRole("button", { name: /property actions/i }));
    expect(screen.getByRole("menuitem", { name: /edit property/i })).toHaveAttribute(
      "href",
      "/dashboard/properties/p1/edit?step=1",
    );
    expect(screen.getByRole("menuitem", { name: /photos/i })).toHaveAttribute("href", "/dashboard/properties/p1/edit?step=6");
    expect(screen.getByRole("menuitem", { name: /schedule open house/i })).toBeInTheDocument();
    unmount();

    render(<PropertyCard variant="seller" property={sellerCard({ canScheduleOpenHouse: false })} />);
    await user.click(screen.getByRole("button", { name: /property actions/i }));
    expect(screen.queryByRole("menuitem", { name: /schedule open house/i })).not.toBeInTheDocument();
  });

  it("offers Add Photos rather than Manage Photos when there is no cover image", async () => {
    const user = userEvent.setup();
    render(<PropertyCard variant="seller" property={sellerCard({ cover_image_path: null })} />);
    await user.click(screen.getByRole("button", { name: /property actions/i }));
    expect(screen.getByRole("menuitem", { name: /add photos/i })).toBeInTheDocument();
  });

  it("shows a draft status badge and a placeholder instead of zeroes for missing fields", () => {
    render(
      <PropertyCard
        variant="seller"
        property={sellerCard({
          listing_status: "draft",
          slug: null,
          display_line: "No address yet",
          asking_price_cents: null,
          pricing_type: "price_undecided",
          bedrooms: null,
          full_bathrooms: null,
          square_feet: null,
          cover_image_path: null,
        })}
      />,
    );
    expect(screen.getByText("DRAFT")).toBeInTheDocument();
    expect(screen.getByText("No address yet")).toBeInTheDocument();
    expect(screen.queryByText(/0 bd|\$0/)).not.toBeInTheDocument();
    expect(screen.getByText(/photo coming soon/i)).toBeInTheDocument();
  });

  it("reuses the public card's redacted location line for hidden addresses", () => {
    render(
      <PropertyCard
        variant="seller"
        property={sellerCard({
          title: "Coming Soon Colonial",
          listing_status: "coming_soon",
          address_visibility: "city_zip",
          display_line: "Amherst, NY 14226",
        })}
      />,
    );
    expect(screen.queryByText(/Maple Road/)).not.toBeInTheDocument();
    expect(screen.getByText("Amherst, NY 14226")).toBeInTheDocument();
    expect(screen.getByText("Exact address hidden publicly.")).toBeInTheDocument();
  });
});
