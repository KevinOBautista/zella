import Link from "next/link";
import { requireAdmin } from "@/lib/auth/session";
import { brand } from "@/config/brand";

const links = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/sellers", label: "Sellers" },
  { href: "/admin/properties", label: "Properties" },
  { href: "/admin/reports", label: "Reports" },
  { href: "/admin/audit-log", label: "Audit Log" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-56 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] p-4 md:block">
        <Link href="/" className="font-display mb-6 block text-lg">
          {brand.name} Admin
        </Link>
        <nav className="flex flex-col gap-1">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="rounded-[var(--radius-sm)] px-3 py-2 text-sm font-medium hover:bg-[var(--color-background)]">
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-4 sm:p-8">{children}</main>
    </div>
  );
}
