import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OverflowMenu } from "@/components/ui/overflow-menu";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));

describe("OverflowMenu", () => {
  it("opens on click and focuses the first item", async () => {
    const user = userEvent.setup();
    render(<OverflowMenu label="Property actions" items={[{ label: "Edit", href: "/edit" }, { label: "Delete", onSelect: vi.fn() }]} />);
    const trigger = screen.getByRole("button", { name: "Property actions" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    await user.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("menuitem", { name: "Edit" })).toHaveFocus();
  });

  it("cycles focus with arrow keys", async () => {
    const user = userEvent.setup();
    render(<OverflowMenu label="Actions" items={[{ label: "One", href: "/1" }, { label: "Two", href: "/2" }]} />);
    await user.click(screen.getByRole("button", { name: "Actions" }));
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Two" })).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "One" })).toHaveFocus();
  });

  it("closes on Escape and returns focus to the trigger", async () => {
    const user = userEvent.setup();
    render(<OverflowMenu label="Actions" items={[{ label: "One", href: "/1" }]} />);
    const trigger = screen.getByRole("button", { name: "Actions" });
    await user.click(trigger);
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("renders href items as links and external items with target=_blank", async () => {
    const user = userEvent.setup();
    render(
      <OverflowMenu label="Actions" items={[{ label: "Public", href: "/homes/x", external: true }, { label: "Edit", href: "/edit" }]} />,
    );
    await user.click(screen.getByRole("button", { name: "Actions" }));
    const pub = screen.getByRole("menuitem", { name: "Public" });
    expect(pub).toHaveAttribute("href", "/homes/x");
    expect(pub).toHaveAttribute("target", "_blank");
    expect(screen.getByRole("menuitem", { name: "Edit" })).not.toHaveAttribute("target");
  });

  it("fires onSelect and closes", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(<OverflowMenu label="Actions" items={[{ label: "Do it", onSelect }]} />);
    await user.click(screen.getByRole("button", { name: "Actions" }));
    await user.click(screen.getByRole("menuitem", { name: "Do it" }));
    expect(onSelect).toHaveBeenCalledOnce();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("is not nested inside a link", () => {
    render(
      <a href="/somewhere">
        <span>card</span>
      </a>,
    );
    const { container } = render(<OverflowMenu label="Actions" items={[{ label: "One", href: "/1" }]} />);
    expect(container.querySelector("a")).toBeNull();
  });
});
