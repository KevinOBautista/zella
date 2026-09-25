import { z } from "zod";
import { requiresPhone } from "@/features/leads/domain";

/**
 * No protected-class fields (race, religion, disability,
 * familial status, national origin, gender, sexual orientation, etc.) —
 * this shape is the entire buyer inquiry contract, public and server-side.
 */
const inquiryBaseSchema = z.object({
    sellerId: z.string().uuid(),
    propertyId: z.string().uuid().nullable(),
    firstName: z.string().trim().min(1, "First name is required").max(100),
    lastName: z.string().trim().min(1, "Last name is required").max(100),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Enter a valid email address"),
    phone: z.string().trim().min(7).max(20).nullable(),
    preferredContactMethod: z.enum(["email", "phone", "text"]),
    inquiryType: z.enum([
      "question",
      "showing_request",
      "more_information",
      "offer_interest",
      "open_house_question",
      "future_property_interest",
      "general_seller_question",
      "other",
    ]),
    buyingStage: z.enum([
      "pre_approved",
      "planning_to_get_pre_approved",
      "cash_buyer",
      "just_starting",
      "prefer_not_to_say",
    ]),
    agentStatus: z.enum(["yes", "no", "prefer_not_to_say"]),
    message: z.string().trim().max(2000).nullable(),
    idempotencyKey: z.string().uuid(),
});

// `.superRefine` returns a ZodEffects wrapper that drops `.shape`. The
// security test in tests/unit/inquiry-schema.test.ts asserts the field list
// directly off `inquirySchema.shape`, so the base shape is re-attached to
// the refined schema rather than losing it.
export const inquirySchema = Object.assign(
  inquiryBaseSchema.superRefine((data, ctx) => {
    if (requiresPhone(data.preferredContactMethod) && !data.phone) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Phone number is required when phone or text is your preferred contact method",
      });
    }
  }),
  { shape: inquiryBaseSchema.shape },
);

export type InquiryInput = z.infer<typeof inquiryBaseSchema>;
