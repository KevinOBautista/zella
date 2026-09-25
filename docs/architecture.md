# Architecture

This document covers the parts of Zella's design that aren't obvious from reading one file at a time: where the trust boundaries are, how data reaches the browser, and how each environment is isolated. The [README](../README.md) has the high-level overview.

## Request flow

```
Browser ──► src/proxy.ts ──► App Router (RSC pages, server actions, 2 route handlers)
                │                         │
                │ refreshes the Supabase  ├─► Supabase (user session)   ── RLS applies
                │ session cookie          └─► Supabase (service role)   ── server-only, narrow uses
                └─ in fixture mode: blocks every write, /api/* and /auth/*
```

- **Server components do the reads.** Pages query Supabase on the server with the caller's session, so RLS decides what comes back. Client components receive DTOs and never create their own data clients for protected data.
- **Server actions do the writes.** Each feature keeps its mutations in `src/features/<feature>/actions.ts`. Every action validates input with a Zod schema that the form also uses. It then resolves the caller server-side (`requireUser`, `requireVerifiedUser`, `requireSeller`) and never trusts ids sent by the client.
- **The service-role client is a narrow exception.** It lives in `src/lib/supabase/admin.ts`, behind `import "server-only"`. It's used where a guest has no session (inquiries, RSVPs), for storage processing, and for notifications. The secret is read from `src/config/env.ts`, which is also `server-only`, so importing it from a client component fails the build.

## Data access and privacy boundary

The Supabase anon key is public by design, so any table with an anon `SELECT` policy can be queried directly with arbitrary columns. The schema is built around that fact:

- **RLS is on everywhere.** Every table has RLS enabled and denies by default.
- **Public reads only go through views.** `properties`, `seller_profiles`, `open_houses` and their child tables have **no** anon or authenticated `SELECT` policy on the base table. All public reads go through the seven `public_*` views.
- **The views redact.** They are `security_barrier` views owned by the migration role, and they compute the public projection themselves. For example, the street address and coordinates are `NULL` unless the seller chose full address visibility. Hidden values are never sent to the browser and then hidden there.
- **Owner and admin access** go through policies built on `is_own_seller()` and `is_admin()`. Both always resolve `auth.uid()` and ignore any argument, so they can't be used to probe another user's role.

This is the "security-definer view as a redaction gate" pattern. Supabase's linter reports it generically (`security_definer_view`); here that finding is intentional.

### Mutations through RPCs

State changes that must be atomic run as `SECURITY DEFINER` Postgres functions. Each one re-derives the caller from `auth.uid()` and checks ownership or admin role itself:

- `change_property_status`: the single place where listing transitions happen. It enforces the status state machine, the per-seller active-listing limit and first-publish validation together, under a row lock. `tests/integration/listing-limit-race.test.ts` fires concurrent publishes to prove the limit holds.
- `cancel_open_house`, `update_lead_status`, `add_lead_note`.
- `admin_*` moderation functions. Each writes its own `admin_audit_logs` row in the same transaction.
- `check_rate_limit`: the only function `anon` may execute, because guest forms need it before any session exists.

Supabase grants `anon` `EXECUTE` on new functions by default. A migration revokes that grant and turns the default off for future functions.

## Listings, leads and open houses

| Domain | Where the rules live | Notes |
|---|---|---|
| Listing lifecycle | `src/features/properties/domain.ts` + `change_property_status` | `draft → coming_soon / for_sale → under_contract → sold`, plus `paused` and `archived`. Moving from Coming Soon to For Sale changes the status of the same record, so id, slug, photos, followers and leads carry over. |
| Address visibility | `toPublicAddress()` + `public_properties` | `full`, `city_zip` or `city_only`. The same rule is implemented as a pure function (unit-tested) and in the view (integration-tested). |
| Buyer inquiries | `src/features/leads/*` | Guests can inquire without an account. The lead is saved first. In-app notification and email are best-effort and can never fail the buyer's submission. |
| Lead workspace | `src/features/leads/pipeline.ts`, `LeadBoard` | Seven statuses, shown in board and list views. Transitions are deliberately permissive so a seller can correct a mis-click. |
| Open houses | `src/features/open-houses/*` | They can only be scheduled on full-address listings. They are grouped into "This Week" and "Later" in `America/New_York` regardless of the viewer's timezone. |

Prices are stored as integer cents throughout (`src/lib/money.ts`). Soft deletion (`deleted_at`) keeps moderation and audit history intact.

## Images

Photos are uploaded straight to storage, so large files never pass through a server function, but they aren't trusted until the server has processed them:

1. `POST /api/uploads/sign` checks ownership and the per-property photo cap, then returns a signed upload URL into the **private** `property-uploads-raw` bucket.
2. The browser uploads directly to that URL.
3. `POST /api/uploads/process` checks that the path belongs to the property. It detects the image type from magic bytes rather than the claimed MIME type, then uses Sharp to auto-orient the image, resize it to a 2400px long edge and re-encode it as WebP. Re-encoding drops EXIF and GPS metadata. The result goes to the public `property-images` bucket at an unguessable path.

If a step fails, the handler cleans up whatever it had already stored, so no orphaned objects are left behind.

Avatars use a separate bucket whose write policy is scoped to `<user_id>/…`. No email address or seller id ever appears in a storage path.

## Abuse controls

Guest-facing forms (inquiry, RSVP, report) run the same ordered checks:

1. Zod validation.
2. A honeypot field.
3. Cloudflare Turnstile, when it's configured.
4. `check_rate_limit`, keyed on an HMAC of the IP. Raw IPs are never stored.
5. An idempotency key with a unique constraint, so a double submit returns the original row instead of creating a duplicate.

Limits live in `src/config/limits.ts`.

Forms never ask for protected-class information.

## Environments

| | Local development | Production | Vercel preview |
|---|---|---|---|
| Data | Local Supabase stack, or fixture mode | Hosted Supabase | Read-only fixture mode (forced) |
| Auth, writes, uploads, email | Local | Real | Off (HTTP 403) |

**Fixture mode** runs the app with no backend. `next.config.ts` forces it whenever `VERCEL_ENV=preview`:

- The Supabase URL and keys are blanked at build time, so they are never inlined into the bundle or allowed by the CSP.
- Pages read a static snapshot of the demo dataset (`src/lib/preview-fixtures/generated.json`), which the `prebuild` step generates.
- `src/proxy.ts` rejects every non-GET request, every `/api/*` route and `/auth/*`.

As a result, a preview deployment can't read or write production data even if production variables are set for it.

`npm run check:bundle` scans a finished build for secret values, secret variable names, fixture identities and operator-only RPC names.

Security headers are set in `next.config.ts`: CSP, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy` and `frame-ancestors 'none'`. The CSP still allows inline scripts; tightening it with nonces is on the roadmap.

## Demo content

Production carries a small demo dataset: 3 sellers, 8 homes and 4 open houses in Western New York, with AI-generated photos. The rules that keep it separate are enforced by the database, not only by the UI:

- **Markers.** Every demo row carries `is_demo`, `demo_dataset` and a stable `seed_key`, with deterministic UUID v5 ids.
- **Who can write demo rows.** Only trusted server-side operations can create, change or delete them. Signed-in users and admins get SQLSTATE `DM001`, including through RPCs.
- **No interactions.** Inquiries, RSVPs, saves, follows and notifications that target demo content are rejected by triggers for every caller. Server actions reject them first, before rate limiting or email.
- **Visibility switch.** One `app_settings` row controls whether demo content is public. The public views and restrictive RLS policies both honor it, including direct detail URLs.
- **Labeling.** Demo listings show a **Demo** badge and a notice on detail pages. They are `noindex`, left out of the sitemap, sorted after real content and counted separately.

The dataset source is in `supabase/demo/wny-demo-2026/`. The seed tooling in `scripts/demo/` is idempotent and defaults to a dry run. It uploads photos to content-addressed storage paths and records every upload and delete in a storage ledger, so an interrupted run can be resumed or rolled back.

## Testing

| Suite | Command | What it covers |
|---|---|---|
| Unit | `npm test` | Domain rules (status transitions, redaction, entitlement math, lead pipeline, date grouping, slugs, money), Zod schemas, search-param parsing, and component behavior with Testing Library. |
| Database | `npm test` | Applies **every migration** to an embedded Postgres (PGlite) with a small Supabase shim. Covers RLS, demo-content protections, the visibility switch and the seed and cleanup RPCs, with no Docker or network needed. |
| Integration | `npm run test:integration` | Runs against a local Supabase stack (and refuses hosted URLs). Covers cross-seller authorization, admin RPC denial, public-view redaction, public visibility of unpublished listings, seller privacy, RLS recursion and the listing-limit race. |

There are no end-to-end browser tests yet.

## Known trade-offs

- `citext` and `pg_trgm` are installed in the `public` schema. Moving them now would mean recreating every `citext` column.
- The seven `public_*` views trigger Supabase's `security_definer_view` lint. That is the intended redaction design described above.
