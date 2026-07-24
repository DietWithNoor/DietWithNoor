import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Diet With Noor - Client Portal",
  description: "Track your wellness journey with Diet With Noor",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
