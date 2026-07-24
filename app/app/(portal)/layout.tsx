import { BottomNav } from "@/components/common/BottomNav";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background pb-24">
      <div className="mx-auto max-w-md px-4 pt-6">{children}</div>
      <BottomNav />
    </div>
  );
}
