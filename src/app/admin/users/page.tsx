import Link from "next/link";
import type { Metadata } from "next";
import { searchAdminUsers } from "@/features/admin/queries";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Admin: Users" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const users = await searchAdminUsers(q);

  return (
    <div>
      <h1 className="font-display mb-6 text-2xl">Users</h1>
      <form method="get" className="mb-6">
        <input name="q" defaultValue={q} placeholder="Search by name" className="h-10 w-full max-w-sm rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 text-sm" />
      </form>
      <div className="space-y-2">
        {users.map((u) => (
          <Card key={u.user_id} className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="font-medium">
                {u.first_name} {u.last_name}
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)]">{u.user_id}</p>
            </div>
            <div className="flex items-center gap-2">
              {u.roles.includes("admin") && <Badge variant="accent">Admin</Badge>}
              {u.seller && (
                <>
                  <Badge variant={u.seller.status === "active" ? "soft" : "danger"}>Seller: {u.seller.status}</Badge>
                  <Link href={`/@${u.seller.username}`} target="_blank" className="text-sm text-[var(--color-accent)] hover:underline">
                    View Profile
                  </Link>
                </>
              )}
              <span className="text-xs text-[var(--color-muted-foreground)]">Joined {new Date(u.created_at).toLocaleDateString()}</span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
