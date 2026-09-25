# Development fixtures

These files are the synthetic Western New York dataset for local development and tests:

- 10 accounts: 1 admin, 6 sellers, 3 buyers
- 16 properties covering every listing status, with 79 placeholder photos
- 3 open houses and 9 RSVPs
- 4 inquiries, one lead note and one lead activity
- 3 follows, 3 saves and a report

All names, businesses and streets are fictional, emails use `@dev.zella.test` / `@example.test`, and no passwords are stored.

```bash
npm run fixtures:restore                      # local Supabase only; reads .env.local
npm run fixtures:restore -- --env-file=<file>
```

- **Idempotent:** rows use deterministic ids (`scripts/lib/ids.ts`) and are upserted, so reruns are safe.
- **Account passwords:** fixture accounts get `SEED_USER_PASSWORD` from the env file, or a random password printed once.
- **Photos:** placeholders are fetched from `https://picsum.photos/seed/<slug>-<n>/1600/1067`. The seed makes them deterministic per URL. They're converted to WebP and uploaded to `property-images/<propertyId>/fixture-<n>.webp`.
  - Offline, each photo becomes a flat color derived from the same seed, so restores never fail for lack of network.
  - These are placeholders only, not house photography.

These fixtures are not the public demo dataset (`supabase/demo/`). They're never bundled into the app (ESLint blocks the import) and can't be restored into a hosted project.
