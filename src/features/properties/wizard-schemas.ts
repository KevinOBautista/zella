import { z } from "zod";

export const PROPERTY_TYPES = [
  "single_family",
  "multi_family",
  "condo",
  "townhouse",
  "co_op",
  "land",
  "manufactured_home",
  "other",
] as const;

export const step1Schema = z.object({
  addressLine1: z.string().trim().min(1, "Street address is required"),
  addressLine2: z.string().trim().optional(),
  city: z.string().trim().min(1, "City is required"),
  state: z.string().trim().length(2, "Use a 2-letter state code"),
  postalCode: z.string().trim().min(5, "ZIP code is required"),
  county: z.string().trim().optional(),
  propertyType: z.enum(PROPERTY_TYPES),
  numberOfUnits: z.coerce.number().int().positive().optional(),
  hoaFeeCents: z.coerce.number().int().nonnegative().optional(),
});
export type Step1Values = z.infer<typeof step1Schema>;

export const step2Schema = z.object({
  listingStatus: z.enum(["draft", "coming_soon", "for_sale"]),
  addressVisibility: z.enum(["full", "city_zip", "city_only"]),
  saleMethod: z.enum(["independent", "agent_assisted"]),
  agentName: z.string().trim().optional(),
  agentBrokerage: z.string().trim().optional(),
  agentEmail: z.string().trim().email().optional().or(z.literal("")),
  agentPhone: z.string().trim().optional(),
  leadRecipient: z.enum(["seller", "agent", "both"]),
});
export type Step2Values = z.infer<typeof step2Schema>;

export const step3Schema = z.object({
  bedrooms: z.coerce.number().int().nonnegative().optional(),
  fullBathrooms: z.coerce.number().int().nonnegative().optional(),
  halfBathrooms: z.coerce.number().int().nonnegative().optional(),
  squareFeet: z.coerce.number().int().positive().optional(),
  lotSize: z.coerce.number().nonnegative().optional(),
  lotSizeUnit: z.enum(["sqft", "acres"]).optional(),
  yearBuilt: z.coerce.number().int().min(1600).max(2100).optional(),
  stories: z.coerce.number().int().positive().optional(),
  parkingSpaces: z.coerce.number().int().nonnegative().optional(),
  garageSpaces: z.coerce.number().int().nonnegative().optional(),
  basementType: z.string().trim().optional(),
  heatingType: z.string().trim().optional(),
  coolingType: z.string().trim().optional(),
  parkingType: z.string().trim().optional(),
  propertyTaxesAnnualCents: z.coerce.number().int().nonnegative().optional(),
});
export type Step3Values = z.infer<typeof step3Schema>;

export const step4Schema = z.object({
  pricingType: z.enum(["asking_price", "expected_range", "price_undecided"]),
  askingPriceCents: z.coerce.number().int().positive().optional(),
  expectedPriceMinCents: z.coerce.number().int().positive().optional(),
  expectedPriceMaxCents: z.coerce.number().int().positive().optional(),
});
export type Step4Values = z.infer<typeof step4Schema>;

export const step5Schema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  description: z.string().trim().max(5000).optional(),
  videoUrl: z.string().trim().url().optional().or(z.literal("")),
  virtualTourUrl: z.string().trim().url().optional().or(z.literal("")),
  featureIds: z.array(z.string().uuid()).default([]),
  customFeatures: z.array(z.string().trim().min(1).max(60)).default([]),
});
export type Step5Values = z.infer<typeof step5Schema>;
