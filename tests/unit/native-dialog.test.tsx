import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { NativeDialog } from "@/components/ui/native-dialog";

beforeAll(() => {
  // jsdom doesn't implement <dialog> methods.
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
  });
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  });
});

describe("NativeDialog", () => {
  it("opens as a modal with an accessible title", () => {
    render(
      <NativeDialog open onClose={() => {}} title="More filters">
        <button type="button">Inside</button>
      </NativeDialog>,
    );
    const dialog = screen.getByRole("dialog", { name: "More filters" });
    expect(dialog).toHaveAttribute("open");
    expect(HTMLDialogElement.prototype.showModal).toHaveBeenCalled();
  });

  it("calls onClose when the dialog closes (Escape / close button)", () => {
    const onClose = vi.fn();
    render(
      <NativeDialog open onClose={onClose} title="More filters">
        <p>body</p>
      </NativeDialog>,
    );
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(onClose).toHaveBeenCalled();
  });

  it("renders nothing visible when closed", () => {
    render(
      <NativeDialog open={false} onClose={() => {}} title="More filters">
        <p>body</p>
      </NativeDialog>,
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
