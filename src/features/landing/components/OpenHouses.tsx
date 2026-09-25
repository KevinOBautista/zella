import Image from "next/image";
import Link from "next/link";
import { formatCents } from "@/lib/money";
import { propertyImageUrl } from "@/lib/storage/publicUrl";
import { formatOpenHouseBadge } from "@/features/open-houses/format";
import { DEMO_COPY } from "@/features/demo/constants";
import type { Tables } from "@/types/database";

type OpenHouseRow = Tables<"public_open_houses">;

/**
 * Upcoming open houses linking to their property pages. Dates always come
 * from stored events (never computed at render time); demo events are
 * labeled wherever their date appears.
 */
export function OpenHouses({ openHouses }: { openHouses: OpenHouseRow[] }) {
  return (
    <section id="open-houses" aria-labelledby="open-houses-heading" className="bg-white py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 id="open-houses-heading" className="max-w-xl text-4xl font-light leading-[1.05] tracking-tight sm:text-5xl">
            Step inside your next possibility.
          </h2>
          <Link href="/open-houses" className="text-sm font-medium underline-offset-4 hover:underline">
            Browse Open Houses →
          </Link>
        </div>

        {openHouses.length === 0 ? (
          <p className="mt-10 rounded-[24px] border border-dashed border-[var(--color-border)] px-6 py-12 text-center text-sm text-[var(--color-muted)]">
            No open houses are scheduled right now. Check back soon.
          </p>
        ) : (
          <ul className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {openHouses.map((oh) => {
              const image = propertyImageUrl(oh.cover_image_path);
              const href = `/homes/${oh.property_slug}`;
              return (
                <li key={oh.id} className="flex flex-col overflow-hidden rounded-[24px] border border-[var(--color-border)] bg-[var(--color-background)]">
                  <Link href={href} className="relative block aspect-[4/3] bg-[var(--color-border)]">
                    {image ? (
                      <Image src={image} alt="" fill loading="lazy" sizes="(min-width: 1024px) 400px, (min-width: 640px) 50vw, 100vw" className="object-cover" />
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-[var(--color-muted-foreground)]">No photo yet</div>
                    )}
                    {oh.starts_at && oh.ends_at && (
                      <p className="absolute left-3 top-3 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold shadow-sm">
                        {oh.is_demo ? "DEMO · " : ""}
                        {formatOpenHouseBadge(oh.starts_at, oh.ends_at)}
                      </p>
                    )}
                  </Link>
                  <div className="flex flex-1 flex-col p-5">
                    <p className="text-lg font-semibold">{oh.asking_price_cents ? formatCents(oh.asking_price_cents) : (oh.property_title ?? "Price to be announced")}</p>
                    <p className="text-sm text-[var(--color-muted)]">
                      {[oh.display_address_line_1, oh.city].filter(Boolean).join(", ")}
                    </p>
                    {oh.seller_username && <p className="mt-1 text-sm text-[var(--color-muted)]">@{oh.seller_username}</p>}
                    {oh.is_demo && <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">{DEMO_COPY.eventNotice}</p>}
                    <Link
                      href={href}
                      className="mt-5 self-start rounded-full border border-[var(--color-foreground)] px-5 py-2.5 text-sm font-medium transition-colors hover:bg-[var(--color-foreground)] hover:text-white"
                    >
                      View Open House
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
