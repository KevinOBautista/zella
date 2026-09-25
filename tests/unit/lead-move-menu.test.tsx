import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LeadMoveMenu } from "@/features/leads/components/LeadMoveMenu";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh }) }));

const updateLeadStatusAction = vi.fn();
vi.mock("@/features/leads/actions", () => ({ updateLeadStatusAction: (...a: unknown[]) => updateLeadStatusAction(...a) }));

const toastError = vi.fn();
const toastSuccess = vi.fn();
vi.mock("sonner", () => ({ toast: { error: (m: string) => toastError(m), success: (m: string) => toastSuccess(m) } }));

beforeEach(() => {
  refresh.mockClear();
  updateLeadStatusAction.mockReset();
  toastError.mockClear();
  toastSuccess.mockClear();
});

describe("LeadMoveMenu", () => {
  it("offers every other status, never the current one", async () => {
    const user = userEvent.setup();
    render(<LeadMoveMenu inquiryId="i1" status="new" />);
    await user.click(screen.getByRole("button", { name: /move to/i }));
    expect(screen.getByRole("menuitem", { name: "Contacted" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Closed" })).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Not Interested" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "New" })).not.toBeInTheDocument();
  });

  it("persists the move and refreshes so every view recounts", async () => {
    const user = userEvent.setup();
    updateLeadStatusAction.mockResolvedValue({ success: true });
    const onMoved = vi.fn();
    render(<LeadMoveMenu inquiryId="i1" status="new" onMoved={onMoved} />);
    await user.click(screen.getByRole("button", { name: /move to/i }));
    await user.click(screen.getByRole("menuitem", { name: "Contacted" }));
    await waitFor(() => expect(updateLeadStatusAction).toHaveBeenCalledWith("i1", "contacted"));
    await waitFor(() => expect(onMoved).toHaveBeenCalledWith("contacted"));
    expect(toastSuccess).toHaveBeenCalled();
    expect(refresh).toHaveBeenCalled();
  });

  it("rolls back to the previous status when the update fails", async () => {
    const user = userEvent.setup();
    updateLeadStatusAction.mockResolvedValue({ error: "Could not update lead status" });
    const onMoved = vi.fn();
    render(<LeadMoveMenu inquiryId="i1" status="new" onMoved={onMoved} />);
    await user.click(screen.getByRole("button", { name: /move to/i }));
    await user.click(screen.getByRole("menuitem", { name: "Closed" }));
    await waitFor(() => expect(toastError).toHaveBeenCalledWith("Could not update lead status"));
    // The optimistic move is undone: the menu still offers Closed and not New.
    await user.click(screen.getByRole("button", { name: /move to/i }));
    expect(screen.getByRole("menuitem", { name: "Closed" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "New" })).not.toBeInTheDocument();
    expect(onMoved).toHaveBeenLastCalledWith("new");
    expect(refresh).not.toHaveBeenCalled();
  });
});
