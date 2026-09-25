import { requireSeller } from "@/lib/auth/session";
import { DashboardSidebar } from "@/components/layout/DashboardSidebar";
import { DashboardMobileHeader } from "@/components/layout/DashboardMobileHeader";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { seller, isSuspended } = await requireSeller();
  const initial = (seller.display_name?.trim()?.[0] ?? seller.username[0] ?? "?").toUpperCase();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <DashboardMobileHeader displayName={seller.display_name} username={seller.username} initial={initial} />
      <aside className="hidden w-64 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] md:block">
        <div className="sticky top-0 max-h-screen overflow-y-auto">
          <DashboardSidebar displayName={seller.display_name} username={seller.username} initial={initial} />
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 py-6 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-6xl">
          {isSuspended && (
            <div className="mb-6 rounded-[var(--radius-md)] border border-[var(--color-danger)] bg-[var(--color-danger-soft)] p-4 text-sm text-[var(--color-danger)]">
              <p className="font-medium">Your seller account is suspended.</p>
              <p className="mt-1">
                You can view your existing data, but you can&apos;t publish or edit public listings or
                schedule new open houses. Contact support if you believe this is a mistake.
              </p>
            </div>
          )}
          {children}
        </div>
      </main>
    </div>
  );
}
