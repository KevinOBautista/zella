/**
 * Property slugs are human-readable but not authoritative — the UUID
 * primary key is. Prefer stable slugs once first published.
 */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip accents
    .toLowerCase()
    .replace(/'/g, "") // drop apostrophes instead of turning them into hyphens
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function buildPropertySlug(addressLine1: string, city: string, state: string): string {
  return slugify(`${addressLine1} ${city} ${state}`);
}

export function resolveSlugCollision(base: string, existingSlugs: string[]): string {
  if (!existingSlugs.includes(base)) return base;
  let suffix = 2;
  while (existingSlugs.includes(`${base}-${suffix}`)) {
    suffix += 1;
  }
  return `${base}-${suffix}`;
}
