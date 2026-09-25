import Link from "next/link";
import { requireVerifiedUser } from "@/lib/auth/session";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Footer } from "@/components/layout/Footer";

const links = [
	{ href: "/account", label: "My Account" },
	{ href: "/account/saved", label: "Saved Homes" },
	{ href: "/account/following", label: "Following" },
	{ href: "/account/rsvps", label: "My RSVPs" },
	{ href: "/account/notifications", label: "Notifications" },
	{ href: "/account/settings", label: "Settings" },
];

export default async function AccountLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	await requireVerifiedUser();

	return (
		<div className="flex min-h-screen flex-col">
			<SiteHeader />
			<div className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-8 sm:px-6 md:flex-row">
				<aside className="shrink-0 md:w-56">
					<nav className="flex gap-1 overflow-x-auto md:flex-col">
						{links.map((link) => (
							<Link
								key={link.href}
								href={link.href}
								className="whitespace-nowrap rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-background)]"
							>
								{link.label}
							</Link>
						))}
					</nav>
				</aside>
				<main className="flex-1">{children}</main>
			</div>
			<Footer />
		</div>
	);
}
