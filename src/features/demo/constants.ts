/**
 * Copy and helpers for public demo content (see docs/architecture.md).
 * Safe to import from client and server code.
 */
import { brand } from "@/config/brand";

export const DEMO_COPY = {
  badge: "Demo",
  propertyNotice: "Sample listing. This property is not available for purchase.",
  sellerNotice: "This is a demo seller profile created to show how the platform works.",
  eventNotice: "Demo event. No in-person open house is scheduled.",
  galleryLabel: "Illustrative photos for a demo listing.",
  contactTitle: "This is a demo listing",
  contactBody: `Demo listings show how ${brand.name} works. Messages aren't collected or sent, and no seller will receive an inquiry.`,
  sellerContactBody: `Demo sellers show how ${brand.name} works. Messages aren't collected or sent to anyone.`,
  rsvpTitle: "This is a demo event",
  rsvpBody: "No in-person open house is scheduled, so RSVPs aren't collected and no confirmation or calendar invite is sent.",
  saveTitle: "Demo listings can't be saved",
  saveBody: "This sample listing isn't for sale, so it isn't added to your saved homes.",
  followTitle: "Demo sellers can't be followed",
  followBody: "This sample profile doesn't post real listings, so there's nothing to follow.",
  actionError: "This is demo content, so this action isn't available.",
} as const;

/** Credit stored on AI-generated demo photos (see scripts/demo/schema.ts). */
export const AI_IMAGE_CREDIT = "AI-generated illustrative image";

/** SQLSTATE raised by the database for any write that targets demo content. */
export const DEMO_CONTENT_SQLSTATE = "DM001";

export function isDemoContentError(error: { code?: string | null; message?: string | null } | null | undefined): boolean {
  if (!error) return false;
  return error.code === DEMO_CONTENT_SQLSTATE || error.message === "DEMO_CONTENT";
}

export type DemoRejection = { error: string; demo: true };

export const demoRejection: DemoRejection = { error: DEMO_COPY.actionError, demo: true };
