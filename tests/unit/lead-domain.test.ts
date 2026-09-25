import { describe, expect, it } from "vitest";
import { LEAD_STATUSES, isValidLeadStatusTransition, requiresPhone } from "@/features/leads/domain";

describe("LEAD_STATUSES", () => {
  it("matches the spec set", () => {
    expect([...LEAD_STATUSES].sort()).toEqual(
      [
        "new",
        "contacted",
        "showing_scheduled",
        "interested",
        "offer_stage",
        "closed",
        "not_interested",
      ].sort(),
    );
  });
});

describe("isValidLeadStatusTransition", () => {
  it("allows moving forward through the pipeline", () => {
    expect(isValidLeadStatusTransition("new", "contacted")).toBe(true);
    expect(isValidLeadStatusTransition("contacted", "showing_scheduled")).toBe(true);
  });

  it("allows any status to move to closed or not_interested", () => {
    expect(isValidLeadStatusTransition("new", "closed")).toBe(true);
    expect(isValidLeadStatusTransition("interested", "not_interested")).toBe(true);
  });

  it("allows a seller to correct a status backward", () => {
    expect(isValidLeadStatusTransition("contacted", "new")).toBe(true);
  });

  it("rejects transitioning to the same status", () => {
    expect(isValidLeadStatusTransition("new", "new")).toBe(false);
  });
});

describe("requiresPhone", () => {
  it("requires phone when preferred contact is phone", () => {
    expect(requiresPhone("phone")).toBe(true);
  });

  it("requires phone when preferred contact is text", () => {
    expect(requiresPhone("text")).toBe(true);
  });

  it("does not require phone for email", () => {
    expect(requiresPhone("email")).toBe(false);
  });
});
