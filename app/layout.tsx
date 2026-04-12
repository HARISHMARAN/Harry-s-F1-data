import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "F1 Pitwall",
  description: "Live telemetry for F1 Pitwall",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
