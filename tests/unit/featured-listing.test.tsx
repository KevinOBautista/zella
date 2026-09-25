import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { FeaturedListing } from "@/features/properties/components/explore/FeaturedListing";
import type { PropertyCardData } from "@/features/properties/components/PropertyCard";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }) }));
vi.mock("@/features/saves/actions", () => ({ toggleSaveAction: vi.fn() }));

// The real inquiry dialog pulls in the whole structured lead form; stub it so
// these tests assert the integration point (which seller, which property, what
// auth state the card hands over) rather than re-testing the form.
const contactProps = vi.fn();
vi.mock("@/features/leads/components/ContactSellerDialog", () => ({
  ContactSellerDialog: (props: Record<string, unknown>) => {
    contactProps(props);
    return (
      <button type="button" data-testid="contact-seller">
        {(props.triggerLabel as string) ?? "Contact Seller"}
      </button>
    );
  },
}));

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
    bedrooms: 4,
    full_bathrooms: 3,
    half_bathrooms: null,
    square_feet: 1868,
    cover_image_path: null,
    has_upcoming_open_house: false,
    seller_id: "s1",
    seller_username: "maple_seller",
    seller_display_name: "Maple Seller",
    seller_profile_image_path: null,
    address_visibility: "full",
    ...over,
  };
}

function renderCard(over: Partial<PropertyCardData> = {}, opts: { isLoggedIn?: boolean } = {}) {
  return render(<FeaturedListing property={card(over)} isSaved={false} isLoggedIn={opts.isLoggedIn ?? false} />);
}

describe("FeaturedListing information hierarchy", () => {
  it('puts "Recently listed" above the address', () => {
    const { container } = renderCard();
    const text = container.textContent ?? "";
    expect(text.indexOf("Recently listed")).toBeGreaterThanOrEqual(0);
    expect(text.indexOf("Recently listed")).toBeLessThan(text.indexOf("127 Maple Road"));
  });

  it("places the Save heart alongside the address rather than over the photograph", () => {
    renderCard();
    const save = screen.getByRole("button", { name: /save home/i });
    // The heart now lives in the white information card, not the image frame.
    expect(save.closest("a")).toBeNull();
    expect(save.closest("[data-testid='featured-photo']")).toBeNull();
    // The heart sits in the same row as the address, aligned to its right.
    const row = save.parentElement as HTMLElement;
    expect(within(row).getByText("127 Maple Road, Amherst, NY 14226")).toBeInTheDocument();
  });

  it("shows beds, baths and square footage as three labelled stats", () => {
    renderCard();
    const stats = screen.getByRole("group", { name: /key facts/i });
    expect(within(stats).getByText("4")).toBeInTheDocument();
    expect(within(stats).getByText(/^beds$/i)).toBeInTheDocument();
    expect(within(stats).getByText("3")).toBeInTheDocument();
    expect(within(stats).getByText(/^baths$/i)).toBeInTheDocument();
    expect(within(stats).getByText("1,868")).toBeInTheDocument();
    expect(within(stats).getByText(/^sq ft$/i)).toBeInTheDocument();
  });

  it("omits an unknown stat instead of showing zero", () => {
    renderCard({ bedrooms: null });
    const stats = screen.getByRole("group", { name: /key facts/i });
    expect(within(stats).queryByText(/^beds$/i)).not.toBeInTheDocument();
    expect(within(stats).queryByText("0")).not.toBeInTheDocument();
  });

  it("renders the price below the statistics", () => {
    const { container } = renderCard();
    const text = container.textContent ?? "";
    expect(text.indexOf("1,868")).toBeLessThan(text.indexOf("$300,000"));
  });

  it("renders a supported price range", () => {
    renderCard({
      pricing_type: "expected_range",
      asking_price_cents: null,
      expected_price_min_cents: 20_000_000,
      expected_price_max_cents: 25_000_000,
    });
    expect(screen.getByText("$200,000 – $250,000")).toBeInTheDocument();
  });

  it("omits the reference's Split options control", () => {
    renderCard();
    expect(screen.queryByText(/split options/i)).not.toBeInTheDocument();
  });
});

describe("FeaturedListing seller panel", () => {
  it('labels the panel "Seller", never "Agent"', () => {
    renderCard();
    const panel = screen.getByRole("group", { name: /seller/i });
    expect(within(panel).getByText(/^seller$/i)).toBeInTheDocument();
    expect(screen.queryByText(/agent/i)).not.toBeInTheDocument();
  });

  it("links the seller identity to the public seller profile", () => {
    renderCard();
    const panel = screen.getByRole("group", { name: /seller/i });
    const link = within(panel).getByRole("link", { name: /Maple Seller/ });
    expect(link).toHaveAttribute("href", "/@maple_seller");
    expect(link).toHaveTextContent("@maple_seller");
  });

  it("shows the seller photograph when one exists", () => {
    renderCard({ seller_profile_image_path: "s1/avatar.jpg" });
    const panel = screen.getByRole("group", { name: /seller/i });
    expect(within(panel).getByRole("img", { name: /Maple Seller/ })).toBeInTheDocument();
  });

  it("falls back to initials when there is no photograph", () => {
    renderCard({ seller_profile_image_path: null });
    const panel = screen.getByRole("group", { name: /seller/i });
    expect(within(panel).queryByRole("img")).not.toBeInTheDocument();
    expect(within(panel).getByText("MS")).toBeInTheDocument();
  });

  it("opens the existing structured inquiry flow for this seller and listing", () => {
    contactProps.mockClear();
    renderCard({}, { isLoggedIn: true });
    expect(screen.getByTestId("contact-seller")).toHaveTextContent("Contact Seller");
    expect(contactProps).toHaveBeenCalledWith(
      expect.objectContaining({ sellerId: "s1", fixedPropertyId: "p1", isLoggedIn: true }),
    );
  });

  it("never exposes private seller contact details", () => {
    const { container } = renderCard();
    expect(container.textContent).not.toMatch(/@\w+\.(com|net|org)|\(\d{3}\)|\d{3}-\d{4}/);
  });

  it("omits the panel entirely when the listing has no seller username", () => {
    renderCard({ seller_username: null });
    expect(screen.queryByRole("group", { name: /seller/i })).not.toBeInTheDocument();
  });
});

describe("FeaturedListing actions", () => {
  it("ends with a View Property button pointing at the public listing route", () => {
    renderCard();
    const view = screen.getByRole("link", { name: /view property/i });
    expect(view).toHaveAttribute("href", "/homes/127-maple-road-amherst-ny");
  });

  it("does not offer tour booking", () => {
    renderCard();
    expect(screen.queryByText(/request a tour|earliest at/i)).not.toBeInTheDocument();
  });

  it("respects a hidden address on a coming soon listing", () => {
    renderCard({
      listing_status: "coming_soon",
      address_visibility: "city_zip",
      display_line: "Amherst, NY 14226",
    });
    expect(screen.getByText("Exact address shared when available.")).toBeInTheDocument();
    expect(screen.queryByText(/Maple Road/)).not.toBeInTheDocument();
  });
});
