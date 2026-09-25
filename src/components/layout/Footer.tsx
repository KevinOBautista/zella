import Link from "next/link";
import { brand } from "@/config/brand";
import { getViewer } from "@/lib/auth/viewer";
import { loginHref, sellerCta, SELLER_DASHBOARD_PATH, type AccountState } from "@/lib/seller-routing";

const columns = [
  {
    title: "Explore",
    links: [
      { href: "/homes", label: "Browse Homes" },
      { href: "/coming-soon", label: "Coming Soon" },
      { href: "/open-houses", label: "Open Houses" },
      { href: "/sellers", label: "Sellers" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/contact", label: "Contact" },
      { href: "/terms", label: "Terms of Service" },
      { href: "/privacy", label: "Privacy Policy" },
      { href: "/fair-housing", label: "Fair Housing Policy" },
    ],
  },
];

/** Account column: guests get sign-in; signed-in users never see "Log In". */
function accountLinks(state: AccountState) {
  const cta = sellerCta(state);
  if (state === "guest") {
    return [
      { href: cta.href, label: cta.label },
      { href: loginHref(), label: "Log In" },
    ];
  }
  const links = [
    { href: "/account", label: "My Account" },
    { href: "/account/saved", label: "Saved Homes" },
    { href: "/account/following", label: "Following" },
  ];
  if (state === "seller") links.push({ href: SELLER_DASHBOARD_PATH, label: "Seller Dashboard" });
  links.push({ href: cta.href, label: cta.label });
  return links;
}

export async function Footer() {
  const { state } = await getViewer();
  const allColumns = [columns[0]!, { title: "Account", links: accountLinks(state) }, columns[1]!];

  return (
    <footer className="border-t border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid grid-cols-2 gap-8 sm:grid-cols-4">
          <div className="col-span-2 sm:col-span-1">
            <p className="font-display text-lg">{brand.name}</p>
            <p className="mt-2 max-w-xs text-sm text-[var(--color-muted)]">{brand.tagline}</p>
            <p className="mt-2 text-sm text-[var(--color-muted)]">Launching in {brand.launchRegion.label}.</p>
          </div>
          {allColumns.map((col) => (
            <div key={col.title}>
              <p className="text-sm font-semibold">{col.title}</p>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-[var(--color-muted)] hover:text-[var(--color-foreground)]">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 border-t border-[var(--color-border)] pt-6 text-xs text-[var(--color-muted-foreground)]">
          <p>
            {brand.name} is a property marketing and buyer-lead platform. We are not a real estate
            broker, attorney, lender, inspector, appraiser, or closing service, and we do not
            provide transaction advice.
          </p>
          <p className="mt-2">
            © {new Date().getFullYear()} {brand.name}. Serving {brand.launchRegion.label}.
          </p>
        </div>
      </div>
    </footer>
  );
}
