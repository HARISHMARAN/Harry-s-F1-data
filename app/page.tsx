\"use client\";

import dynamic from \"next/dynamic\";

const DashboardApp = dynamic(() => import("../src/App"), {
  ssr: false,
  loading: () => (
    <main style={{ padding: "2rem", color: "#f2f2f2", fontFamily: "sans-serif" }}>
      Loading Pitwall...
    </main>
  ),
});

export default function HomePage() {
  return <DashboardApp />;
}
