import Link from "next/link";
import { Bell, Heart } from "lucide-react";
import { brand } from "@/config/brand";
import { getUnreadNotificationCount } from "@/features/notifications/queries";
import { getViewer } from "@/lib/auth/viewer";
import { loginHref, sellerCta } from "@/lib/seller-routing";
import { navLinksFor } from "@/config/nav";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AvatarMenu } from "./AvatarMenu";
import { MobileMenu } from "./MobileMenu";

/**
 * Server-rendered from the real session, so there is never a flash of guest
 * controls while auth loads — the correct state ships in the HTML.
 */
export async function SiteHeader() {
	const { user, state, initial } = await getViewer();
	const unreadCount = user ? await getUnreadNotificationCount(user.id) : 0;
	const cta = sellerCta(state);
	const links = navLinksFor(state);

	return (
		// Translucent so the page gradient stays visible through the bar.
		// <header className="sticky top-0 z-30 border-b border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface)_50%,transparent)] backdrop-blur">
		// 	<div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
		<header className="sticky inset-x-0 top-0 z-30 border-b border-[var(--color-border)] bg-[color-mix(in_oklab,var(--color-surface)_50%,transparent)] backdrop-blur">
			<div className="mx-auto flex max-w-7xl items-center justify-between px-4 pb-2 sm:px-6 sm:pt-3">
				{/* <Link href="/" className="font-display text-xl text-[var(--color-foreground)]">
          {brand.name}
        </Link> */}
				<Link
					href="/"
					className="px-4 py-2 text-base font-semibold tracking-tight text-[var(--color-foreground)]"
				>
					{brand.name}
				</Link>

				<nav aria-label="Primary" className="hidden items-center gap-6 md:flex">
					{links.map((link) => (
						<Link
							key={link.href}
							href={link.href}
							className="text-sm font-medium text-[var(--color-foreground)] hover:text-[var(--color-accent)]"
						>
							{link.label}
						</Link>
					))}
				</nav>

				<div className="flex items-center gap-3">
					{state !== "guest" ? (
						<>
							<Link
								href="/account/saved"
								aria-label="Saved homes"
								className="hidden h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--color-background)] sm:flex"
							>
								<Heart size={20} />
							</Link>
							<Link
								href="/account/notifications"
								aria-label="Notifications"
								className="relative hidden h-9 w-9 items-center justify-center rounded-full hover:bg-[var(--color-background)] sm:flex"
							>
								<Bell size={20} />
								{unreadCount > 0 && (
									<>
										<span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-[var(--color-danger)]" />
										<span className="sr-only">{unreadCount} unread</span>
									</>
								)}
							</Link>
							<Link
								href={cta.href}
								className={cn(
									buttonVariants({ variant: "primary", size: "sm" }),
									"hidden md:inline-flex",
								)}
							>
								{cta.label}
							</Link>
							<AvatarMenu initial={initial} state={state} />
						</>
					) : (
						<div className="hidden items-center gap-3 md:flex">
							<Link
								href={loginHref()}
								className="text-sm font-medium hover:text-[var(--color-accent)]"
							>
								Log In
							</Link>
							<Link
								href={cta.href}
								className="rounded-[var(--radius-md)] bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-[var(--color-accent-foreground)] hover:opacity-90"
							>
								{cta.label}
							</Link>
						</div>
					)}
					<MobileMenu links={links} state={state} sellerCta={cta} />
				</div>
			</div>
		</header>
	);
}
