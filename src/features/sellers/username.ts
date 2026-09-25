import { z } from "zod";

/**
 * Reserved so a seller username can never collide with a real route.
 * Kept in sync with supabase/migrations (a `reserved_usernames` lookup
 * table enforces this at the database layer too — see docs/architecture.md).
 */
export const RESERVED_USERNAMES = [
  "admin",
  "support",
  "api",
  "login",
  "signup",
  "logout",
  "forgot-password",
  "reset-password",
  "verify-email",
  "onboarding",
  "properties",
  "homes",
  "search",
  "dashboard",
  "settings",
  "account",
  "sellers",
  "open-houses",
  "coming-soon",
  "terms",
  "privacy",
  "fair-housing",
  "contact",
  "notifications",
  "saved",
  "following",
  "rsvps",
  "leads",
  "u",
  "auth",
  "www",
  "help",
] as const;

export function normalizeUsername(input: string): string {
  return input.trim().toLowerCase();
}

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(30, "Username must be at most 30 characters")
  .regex(/^[a-zA-Z0-9_.]+$/, "Only letters, numbers, underscores, and periods are allowed")
  .refine((value) => !RESERVED_USERNAMES.includes(normalizeUsername(value) as never), {
    message: "This username is reserved",
  })
  .transform((value) => normalizeUsername(value));
