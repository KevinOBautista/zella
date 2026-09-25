import Image from "next/image";
import Link from "next/link";
import { landingImages } from "@/features/landing/data";
import { sellerCta, type AccountState } from "@/lib/seller-routing";

const copy: Record<
	AccountState,
	{ heading: string; body: string; showPricing: boolean; primary: string }
> = {
	guest: {
		heading: "Your next listing starts here.",
		body: "Create your seller profile, showcase your properties, and give interested buyers a clear way to reach you.",
		showPricing: true,
		primary: "Create Your Seller Profile",
	},
	buyer: {
		heading: "Have a property to sell?",
		body: "Start selling with your existing account. Create your seller profile and bring your properties together in one place.",
		showPricing: true,
		primary: "Start Selling",
	},
	seller: {
		heading: "Ready for your next listing?",
		body: "Manage your properties, update your listings, and keep your seller profile current.",
		showPricing: false,
		primary: "Manage Properties",
	},
};

/** Lower seller promotion. Same panel for every state; only copy and destination change. */
export function SellerCta({ state }: { state: AccountState }) {
	const c = copy[state];
	const cta = sellerCta(state);

	return (
		<section
			aria-labelledby="cta-heading"
			className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:pb-28"
		>
			<div className="grid overflow-hidden rounded-[32px] bg-[#e9e3da] lg:grid-cols-12">
				<div className="p-8 sm:p-12 lg:col-span-6 lg:p-16">
					<h2
						id="cta-heading"
						className="text-4xl font-light leading-[1.05] tracking-tight sm:text-5xl"
					>
						{c.heading}
					</h2>
					<p className="mt-5 max-w-md text-base text-[var(--color-muted)]">
						{c.body}
					</p>
					{c.showPricing && (
						<>
							<p className="mt-8 text-lg font-medium">
								Your first 5 active property listings are free.
							</p>
							<p className="mt-1 text-sm text-[var(--color-muted)]">
								Need more? Add additional active listings with per-property
								pricing.
							</p>
						</>
					)}
					<div className="mt-8 flex flex-wrap items-center gap-4">
						<Link
							href={cta.href}
							className="rounded-full bg-[var(--color-foreground)] px-6 py-3 text-sm font-medium text-white transition-opacity hover:opacity-90"
						>
							{c.primary}
						</Link>
						<Link
							href="/homes"
							className="text-sm font-medium underline-offset-4 hover:underline"
						>
							Explore Homes
						</Link>
					</div>
				</div>
				<div className="relative min-h-[280px] lg:col-span-6 lg:min-h-[480px]">
					<Image
						src={landingImages.sellerCta}
						alt="Large wood-sided home on an open lawn at sunset"
						fill
						loading="lazy"
						sizes="(min-width: 1024px) 640px, 100vw"
						className="object-cover"
					/>
				</div>
			</div>
		</section>
	);
}
