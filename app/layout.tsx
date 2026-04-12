import type { ReactNode } from "react";

export const metadata = {
  title: "F1 Pitwall",
  description: "Live telemetry for F1 Pitwall",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
