import { z } from "zod";
import { usernameSchema } from "@/features/sellers/username";

const optionalUrl = z
  .string()
  .trim()
  .url("Enter a valid URL")
  .optional()
  .or(z.literal(""))
  .transform((v) => (v ? v : null));

export const sellerProfileSchema = z.object({
  accountType: z.enum(["individual", "business"]),
  displayName: z.string().trim().min(1, "Display name is required").max(80),
  username: usernameSchema,
  bio: z.string().trim().max(1000).optional().or(z.literal("")).transform((v) => v || null),
  city: z.string().trim().min(1, "City is required").max(100),
  state: z.string().trim().min(2, "State is required").max(2),
  websiteUrl: optionalUrl,
  instagramUrl: optionalUrl,
});

export type SellerProfileInput = z.infer<typeof sellerProfileSchema>;
