import { BottomNav } from "@/components/common/BottomNav";
import { PortalGuard } from "@/components/common/PortalGuard";
import { PortalHeader } from "@/components/common/PortalHeader";
import { AuthProvider } from "@/lib/auth-context";

/**
 * AuthProvider is mounted here (not per page) so user + profile are fetched
 * once and shared. Switching bottom-nav tabs no longer refetches or flashes.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <PortalHeader />
        <div className="mx-auto max-w-md px-4 pb-32 pt-6">
          <PortalGuard>{children}</PortalGuard>
        </div>
        <BottomNav />
      </div>
    </AuthProvider>
  );
}
