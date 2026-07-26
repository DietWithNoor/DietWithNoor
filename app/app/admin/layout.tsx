import { AdminNav } from "@/components/admin/AdminNav";
import { AuthProvider } from "@/lib/auth-context";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <AdminNav />
        <main className="mx-auto max-w-6xl px-4 py-7 sm:px-6">{children}</main>
      </div>
    </AuthProvider>
  );
}
