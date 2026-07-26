import { AuthProvider } from "@/lib/auth-context";

/**
 * The wizard lives outside the (portal) route group (no bottom nav), but it
 * still needs the shared user/profile context.
 */
export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
