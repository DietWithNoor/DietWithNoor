import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-4">
          <h1 className="text-lg font-bold">Diet With Noor — Admin</h1>
          <nav className="flex gap-4 text-sm font-medium">
            <Link href="/app/admin" className="hover:text-primary">
              Overview
            </Link>
            <Link href="/app/admin/users" className="hover:text-primary">
              Users
            </Link>
            <Link href="/app/admin/export" className="hover:text-primary">
              Export
            </Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
    </div>
  );
}
