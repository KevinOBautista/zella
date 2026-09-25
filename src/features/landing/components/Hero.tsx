import Image from "next/image";
import Link from "next/link";
import { brand } from "@/config/brand";
import { landingImages } from "@/features/landing/data";
import type { Cta } from "@/lib/seller-routing";
import { HeroSearch } from "./HeroSearch";

/** `cta` is the account-aware seller entry point from sellerCta(). */
export function Hero({ cta }: { cta: Cta }) {
	return (
		<section className="relative isolate min-h-[calc(100svh-2rem)] overflow-hidden rounded-b-[32px] sm:min-h-[92svh]">
			<Image
				src={landingImages.hero}
				alt="White two-story home with a wraparound porch and a wide lawn"
				fill
				priority
				sizes="100vw"
				className="object-cover object-[50%_45%]"
			/>
			<div
				aria-hidden="true"
				className="absolute inset-0 bg-gradient-to-b from-[#1c1c1a]/55 via-[#1c1c1a]/15 to-[#1c1c1a]/60"
			/>

			<div className="relative mx-auto flex min-h-[inherit] max-w-7xl flex-col justify-between px-4 pb-64 pt-28 sm:px-6 sm:pb-72 sm:pt-36 lg:pb-80 lg:pt-40">
				<div className="max-w-3xl">
					<p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/85">
						Homes. Open houses. Direct connections.
					</p>
					<h1 className="mt-5 text-[2.75rem] font-light leading-[1.02] tracking-tight text-white sm:text-6xl lg:text-7xl">
						Your next chapter.
						<br />A place to call home.
					</h1>
					<p className="mt-6 max-w-xl text-base text-white/90 sm:text-lg">
						Explore homes across Western New York, follow local sellers, and
						discover what&rsquo;s coming next.
					</p>
					<div className="mt-8 flex flex-wrap gap-3">
						<Link
							href="/homes"
							className="rounded-full bg-white px-6 py-3 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-background)]"
						>
							Explore Homes
						</Link>
						<Link
							href={cta.href}
							className="rounded-full border border-white/60 px-6 py-3 text-sm font-medium text-white backdrop-blur transition-colors hover:bg-white/10"
						>
							{cta.label}
						</Link>
					</div>
				</div>

				<div className="mt-12 max-w-4xl ">
					<HeroSearch />
					<p className="mt-3 text-sm text-white/80">
						Starting in {brand.launchRegion.label.replace("&", "and")}.
					</p>
				</div>
			</div>
		</section>
	);
}
