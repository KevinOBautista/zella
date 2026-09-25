import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { Pagination, pageWindow } from "@/components/shared/Pagination";

describe("pageWindow", () => {
  it("returns every page when there are 7 or fewer", () => {
    expect(pageWindow(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it("collapses the middle into an ellipsis for many pages", () => {
    expect(pageWindow(5, 20)).toEqual([1, null, 4, 5, 6, null, 20]);
  });
});

describe("Pagination", () => {
  it("renders nothing for a single page", () => {
    const { container } = render(<Pagination page={1} totalPages={1} hrefFor={(p) => `/x?page=${p}`} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("disables Previous on the first page and links Next", () => {
    render(<Pagination page={1} totalPages={3} hrefFor={(p) => `/x?page=${p}`} />);
    expect(screen.getByText("Previous").closest("a")).toBeNull();
    const next = screen.getByRole("link", { name: /next/i });
    expect(next).toHaveAttribute("href", "/x?page=2");
  });

  it("disables Next on the last page and links Previous", () => {
    render(<Pagination page={3} totalPages={3} hrefFor={(p) => `/x?page=${p}`} />);
    expect(screen.getByText("Next").closest("a")).toBeNull();
    const prev = screen.getByRole("link", { name: /previous/i });
    expect(prev).toHaveAttribute("href", "/x?page=2");
  });

  it("marks the current page with aria-current and links others via hrefFor", () => {
    const hrefFor = vi.fn((p: number) => `/x?page=${p}`);
    render(<Pagination page={2} totalPages={3} hrefFor={hrefFor} />);
    expect(screen.getByText("2")).toHaveAttribute("aria-current", "page");
    const pageOne = screen.getByRole("link", { name: "Page 1" });
    expect(pageOne).toHaveAttribute("href", "/x?page=1");
  });
});
