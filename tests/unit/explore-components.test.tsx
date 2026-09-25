import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { parseHomesSearchParams } from "@/features/properties/search-params";
import { ExploreSearchPanel } from "@/features/properties/components/explore/ExploreSearchPanel";
import { SortSelect } from "@/features/properties/components/explore/SortSelect";
import { ActiveFilterChips } from "@/features/properties/components/explore/ActiveFilterChips";
import { ExplorePagination } from "@/features/properties/components/explore/ExplorePagination";
import { QuickToggles } from "@/features/properties/components/explore/QuickToggles";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push, replace: vi.fn(), refresh: vi.fn() }) }));

beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  });
});

beforeEach(() => push.mockClear());

describe("ExploreSearchPanel", () => {
  it("seeds controls from the applied search", () => {
    render(<ExploreSearchPanel initial={parseHomesSearchParams({ q: "Buffalo", minPrice: "250000", bedrooms: "3", propertyType: "condo" })} />);
    expect(screen.getByLabelText(/location/i)).toHaveValue("Buffalo");
    expect(screen.getByLabelText(/min price/i)).toHaveValue("250000");
    expect(screen.getByLabelText(/bedrooms/i)).toHaveValue("3");
    expect(screen.getByLabelText(/property type/i)).toHaveValue("condo");
  });

  it("does not navigate while typing, only on submit", async () => {
    const user = userEvent.setup();
    render(<ExploreSearchPanel initial={parseHomesSearchParams({})} />);
    await user.type(screen.getByLabelText(/location/i), "Amherst");
    expect(push).not.toHaveBeenCalled();
    await user.keyboard("{Enter}");
    expect(push).toHaveBeenCalledWith("/homes?q=Amherst");
  });

  it("keeps the applied sort and resets the page when searching", async () => {
    const user = userEvent.setup();
    render(<ExploreSearchPanel initial={parseHomesSearchParams({ sort: "price_asc", page: "3", q: "Buffalo" })} />);
    await user.click(screen.getByRole("button", { name: /^search$/i }));
    expect(push).toHaveBeenCalledWith("/homes?q=Buffalo&sort=price_asc");
  });

  it("blocks submit with an inline error when max is below min", async () => {
    const user = userEvent.setup();
    render(<ExploreSearchPanel initial={parseHomesSearchParams({})} />);
    await user.type(screen.getByLabelText(/min price/i), "400000");
    await user.type(screen.getByLabelText(/max price/i), "250000");
    await user.click(screen.getByRole("button", { name: /^search$/i }));
    expect(push).not.toHaveBeenCalled();
    expect(screen.getByRole("alert")).toHaveTextContent(/max price/i);
    expect(screen.getByLabelText(/max price/i)).toHaveAttribute("aria-invalid", "true");
  });

  it("accepts formatted dollar input", async () => {
    const user = userEvent.setup();
    render(<ExploreSearchPanel initial={parseHomesSearchParams({})} />);
    await user.type(screen.getByLabelText(/max price/i), "$400,000");
    await user.click(screen.getByRole("button", { name: /^search$/i }));
    expect(push).toHaveBeenCalledWith("/homes?maxPrice=400000");
  });

  it("opens More filters in a dialog and applies them on Apply", async () => {
    const user = userEvent.setup();
    render(<ExploreSearchPanel initial={parseHomesSearchParams({ q: "Buffalo" })} />);
    await user.click(screen.getByRole("button", { name: /more filters/i }));
    const dialog = screen.getByRole("dialog", { name: /more filters/i });
    await user.selectOptions(within(dialog).getByLabelText(/bathrooms/i), "2");
    await user.type(within(dialog).getByLabelText(/square feet/i), "1500");
    await user.click(within(dialog).getByRole("button", { name: /apply/i }));
    expect(push).toHaveBeenCalledWith("/homes?q=Buffalo&bathrooms=2&minSqft=1500");
  });

  it("shows how many advanced filters are applied on the trigger", () => {
    render(<ExploreSearchPanel initial={parseHomesSearchParams({ bathrooms: "2", minSqft: "1000" })} />);
    expect(screen.getByRole("button", { name: /more filters/i })).toHaveTextContent("2");
  });
});

describe("SortSelect", () => {
  it("navigates with the new sort and resets the page", () => {
    render(<SortSelect search={parseHomesSearchParams({ q: "Buffalo", page: "3" })} />);
    fireEvent.change(screen.getByLabelText(/sort/i), { target: { value: "price_desc" } });
    expect(push).toHaveBeenCalledWith("/homes?q=Buffalo&sort=price_desc");
  });
});

describe("ActiveFilterChips", () => {
  it("renders a removable chip per filter plus Clear all", () => {
    render(<ActiveFilterChips search={parseHomesSearchParams({ q: "Buffalo", bedrooms: "3", sort: "price_asc" })} />);
    expect(screen.getByRole("link", { name: /remove filter: Buffalo/i })).toHaveAttribute("href", "/homes?bedrooms=3&sort=price_asc");
    expect(screen.getByRole("link", { name: /remove filter: 3\+ beds/i })).toHaveAttribute("href", "/homes?q=Buffalo&sort=price_asc");
    expect(screen.getByRole("link", { name: /clear all/i })).toHaveAttribute("href", "/homes?sort=price_asc");
  });
  it("renders nothing without filters", () => {
    const { container } = render(<ActiveFilterChips search={parseHomesSearchParams({})} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("ExplorePagination", () => {
  it("links pages while preserving filters and marks the current page", () => {
    render(<ExplorePagination search={parseHomesSearchParams({ q: "Buffalo", page: "2" })} page={2} totalPages={5} />);
    const nav = screen.getByRole("navigation", { name: /pagination/i });
    expect(within(nav).getByRole("link", { name: /previous/i })).toHaveAttribute("href", "/homes?q=Buffalo");
    expect(within(nav).getByRole("link", { name: /next/i })).toHaveAttribute("href", "/homes?q=Buffalo&page=3");
    expect(within(nav).getByText("2")).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Page 5" })).toHaveAttribute("href", "/homes?q=Buffalo&page=5");
  });
  it("disables the bounds", () => {
    render(<ExplorePagination search={parseHomesSearchParams({})} page={1} totalPages={2} />);
    const nav = screen.getByRole("navigation", { name: /pagination/i });
    expect(within(nav).queryByRole("link", { name: /previous/i })).not.toBeInTheDocument();
    expect(within(nav).getByText(/previous/i)).toHaveAttribute("aria-disabled", "true");
  });
  it("renders nothing for a single page", () => {
    const { container } = render(<ExplorePagination search={parseHomesSearchParams({})} page={1} totalPages={1} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe("QuickToggles", () => {
  it("toggles coming soon and open house filters with pressed state", () => {
    render(<QuickToggles search={parseHomesSearchParams({ status: "coming_soon", page: "2" })} />);
    const comingSoon = screen.getByRole("link", { name: /coming soon/i });
    expect(comingSoon).toHaveAttribute("aria-pressed", "true");
    expect(comingSoon).toHaveAttribute("href", "/homes");
    const oh = screen.getByRole("link", { name: /open houses/i });
    expect(oh).toHaveAttribute("aria-pressed", "false");
    expect(oh).toHaveAttribute("href", "/homes?status=coming_soon&openHouse=1");
  });
});
