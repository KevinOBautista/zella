import { z } from "zod";

export const reportSchema = z.object({
  propertyId: z.string().uuid().nullable(),
  sellerId: z.string().uuid().nullable(),
  reason: z.enum([
    "fraud",
    "incorrect_information",
    "discriminatory_content",
    "stolen_photos",
    "duplicate_listing",
    "spam",
    "other",
  ]),
  description: z.string().trim().max(2000).optional(),
  reporterEmail: z.string().trim().toLowerCase().email().optional(),
  idempotencyKey: z.string().uuid(),
});

export type ReportInput = z.infer<typeof reportSchema>;
