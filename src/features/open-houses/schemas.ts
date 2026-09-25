import { z } from "zod";

/** Guest RSVP form contract, shared by guest and logged-in submitters. */
export const rsvpSchema = z.object({
  openHouseId: z.string().uuid(),
  firstName: z.string().trim().min(1, "First name is required").max(100),
  lastName: z.string().trim().min(1, "Last name is required").max(100),
  email: z.string().trim().toLowerCase().email("Enter a valid email address"),
  phone: z.string().trim().min(7).max(20).nullable(),
  partySize: z.number().int().min(1, "Party size must be at least 1").max(20, "Party size seems too large"),
  agentStatus: z.enum(["working_with_agent", "not_working_with_agent", "prefer_not_to_say"]),
  message: z.string().trim().max(1000).nullable(),
  idempotencyKey: z.string().uuid(),
});

export type RsvpInput = z.infer<typeof rsvpSchema>;
