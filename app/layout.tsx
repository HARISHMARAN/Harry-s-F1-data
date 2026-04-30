/* eslint-disable react-refresh/only-export-components */
import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "F1 Pitwall",
  description: "Live telemetry for F1 Pitwall",
  robots: {
    index: false,
    follow: false,
    nocache: true,
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
