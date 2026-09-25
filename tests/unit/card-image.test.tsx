import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { CardImage } from "@/features/properties/components/CardImage";

describe("CardImage", () => {
  it("renders the placeholder when there is no source", () => {
    render(<CardImage src={null} sizes="100vw" />);
    expect(screen.getByText(/photo coming soon/i)).toBeInTheDocument();
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });

  it("swaps to the placeholder when the image fails to load", () => {
    render(<CardImage src="https://example.com/x.jpg" sizes="100vw" />);
    const img = document.querySelector("img")!;
    expect(img).toBeTruthy();
    expect(img.getAttribute("alt")).toBe("");
    fireEvent.error(img);
    expect(screen.getByText(/photo coming soon/i)).toBeInTheDocument();
  });
});
