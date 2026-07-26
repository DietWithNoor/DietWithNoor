import { BottomNav } from "@/components/common/BottomNav";
import { PortalGuard } from "@/components/common/PortalGuard";
import { AuthProvider } from "@/lib/auth-context";

/**
 * AuthProvider is mounted here (not per page) so user + profile are fetched
 * once and shared. Switching bottom-nav tabs no longer refetches or flashes.
 */
export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-md px-4 pb-32 pt-[max(1.5rem,env(safe-area-inset-top))]">
          <PortalGuard>{children}</PortalGuard>
        </div>
        <BottomNav />
      </div>
    </AuthProvider>
  );
}
