"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, Heart, Menu, X } from "lucide-react";
import { brand } from "@/config/brand";
import { cn } from "@/lib/utils";
import { AvatarMenu } from "@/components/layout/AvatarMenu";
import { accountNavItems, navLinksFor } from "@/config/nav";
import { loginHref, type AccountState, type Cta } from "@/lib/seller-routing";

/**
 * Landing-page header drawn over the hero. Same destinations and account-aware
 * behaviour as the site-wide header (both read @/config/nav) — only the visual
 * container differs. Rendered from server-derived account state (no client auth
 * fetch), so the correct controls ship in the HTML with no guest flash.
 */
export function LandingNav({
	state,
	initial,
	cta,
	unreadCount = 0,
}: {
	state: AccountState;
	initial: string;
	cta: Cta;
	unreadCount?: number;
}) {
	const [open, setOpen] = useState(false);
	const links = navLinksFor(state);

	useEffect(() => {
		if (!open) return;
		const onKey = (e: KeyboardEvent) => {
			if (e.key === "Escape") setOpen(false);
		};
		document.addEventListener("keydown", onKey);
		document.body.style.overflow = "hidden";
		return () => {
			document.removeEventListener("keydown", onKey);
			document.body.style.overflow = "";
		};
	}, [open]);

	return (
		<header className="absolute inset-x-0 top-0 z-30">
			<div className="mx-auto flex max-w-7xl items-center justify-between px-4 pt-4 sm:px-6 sm:pt-2">
				<Link
					href="/"
					className="rounded-full bg-white/90 px-4 py-2 text-base font-semibold tracking-tight text-[var(--color-foreground)] backdrop-blur"
				>
					{brand.name}
				</Link>

				<nav
					aria-label="Primary"
					className="hidden items-center gap-1 rounded-full bg-white/90 p-1 shadow-sm backdrop-blur lg:flex"
				>
					{links.map((link) => (
						<Link
							key={link.href}
							href={link.href}
							className="rounded-full px-4 py-2 text-sm font-medium text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-background)]"
						>
							{link.label}
						</Link>
					))}
				</nav>

				<div className="flex items-center gap-2">
					{state === "guest" ? (
						<Link
							href={loginHref()}
							className="hidden rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-[var(--color-foreground)] backdrop-blur transition-colors hover:bg-white lg:inline-flex"
						>
							Log In
						</Link>
					) : (
						<div className="hidden items-center gap-1 rounded-full bg-white/90 p-1 shadow-sm backdrop-blur lg:flex">
							<Link
								href="/account/saved"
								aria-label="Saved Listings"
								className="flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-background)]"
							>
								<Heart size={18} />
							</Link>
							<Link
								href="/account/notifications"
								aria-label="Notifications"
								className="relative flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-foreground)] transition-colors hover:bg-[var(--color-background)]"
							>
								<Bell size={18} />
								{unreadCount > 0 && (
									<>
										<span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-[var(--color-danger)]" />
										<span className="sr-only">{unreadCount} unread</span>
									</>
								)}
							</Link>
						</div>
					)}
					<Link
						href={cta.href}
						className="hidden rounded-full bg-[var(--color-foreground)] px-5 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90 lg:inline-flex"
					>
						{cta.label}
					</Link>
					{state !== "guest" && (
						<AvatarMenu initial={initial} state={state} variant="landing" />
					)}
					<button
						type="button"
						aria-label={open ? "Close menu" : "Open menu"}
						aria-expanded={open}
						aria-controls="landing-mobile-menu"
						onClick={() => setOpen((v) => !v)}
						className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[var(--color-foreground)] backdrop-blur lg:hidden"
					>
						{open ? <X size={22} /> : <Menu size={22} />}
					</button>
				</div>
			</div>

			<div
				id="landing-mobile-menu"
				hidden={!open}
				className={cn(
					"fixed inset-0 z-40 bg-[var(--color-background)] px-6 pb-8 pt-20 lg:hidden",
					!open && "hidden",
				)}
			>
				<button
					type="button"
					aria-label="Close menu"
					onClick={() => setOpen(false)}
					className="absolute right-4 top-4 flex h-11 w-11 items-center justify-center rounded-full border border-[var(--color-border)] bg-white"
				>
					<X size={22} />
				</button>
				<nav aria-label="Mobile" className="flex flex-col gap-1">
					{links.map((link) => (
						<Link
							key={link.href}
							href={link.href}
							onClick={() => setOpen(false)}
							className="rounded-[12px] px-3 py-3 text-lg font-medium hover:bg-white"
						>
							{link.label}
						</Link>
					))}
					{state !== "guest" &&
						accountNavItems.map((item) => (
							<Link
								key={item.href}
								href={item.href}
								onClick={() => setOpen(false)}
								className="rounded-[12px] px-3 py-3 text-lg font-medium hover:bg-white"
							>
								{item.label}
								{item.href === "/account/notifications" && unreadCount > 0 && (
									<span className="ml-2 text-sm text-[var(--color-danger)]">
										{unreadCount} unread
									</span>
								)}
							</Link>
						))}
				</nav>
				<div className="mt-6 flex flex-col gap-2 border-t border-[var(--color-border)] pt-6">
					<Link
						href={cta.href}
						onClick={() => setOpen(false)}
						className="rounded-full bg-[var(--color-foreground)] px-5 py-3.5 text-center text-base font-medium text-white"
					>
						{cta.label}
					</Link>
					{state === "guest" ? (
						<Link
							href={loginHref()}
							onClick={() => setOpen(false)}
							className="rounded-full border border-[var(--color-border)] bg-white px-5 py-3.5 text-center text-base font-medium"
						>
							Log In
						</Link>
					) : (
						<Link
							href="/account"
							onClick={() => setOpen(false)}
							className="rounded-full border border-[var(--color-border)] bg-white px-5 py-3.5 text-center text-base font-medium"
						>
							My Account
						</Link>
					)}
				</div>
			</div>
		</header>
	);
}
