import type { Metadata } from "next";
import { AdminNav } from "@/components/admin/AdminNav";
import { requireAdminPage } from "@/lib/admin";

export const metadata: Metadata = { title: { default: "Admin", template: "%s | Rumm admin" }, robots: { index: false } };
export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdminPage();
  return (
    <div className="admin">
      <header className="admin-head">
        <p className="admin-who">
          Admin <span>{admin.email}</span>
        </p>
        <AdminNav />
      </header>
      {children}
    </div>
  );
}
