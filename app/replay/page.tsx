"use client";

import { useRouter } from "next/navigation";
import Header from "../../src/components/Header";
import RaceReplay from "../../src/components/RaceReplay";
import { DASHBOARD_TITLE } from "../../src/constants";

export default function ReplayPage() {
  const router = useRouter();

  return (
    <div className="app-container" style={{ minHeight: "100vh" }}>
      <div style={{ position: "relative", zIndex: 100, pointerEvents: "none", width: "100%" }}>
        <div style={{ pointerEvents: "auto" }}>
          <Header sessionName={`${DASHBOARD_TITLE} Replay`} isLive={false} />

          <div style={{ display: "flex", justifyContent: "center", marginBottom: "1.5rem" }}>
            <div className="mode-toggle">
              <button
                className="toggle-btn"
                onClick={() => router.push("/?mode=live")}
              >
                ● LIVE TELEMETRY
              </button>
              <button
                className="toggle-btn"
                onClick={() => router.push("/?mode=historical")}
              >
                HISTORICAL ARCHIVE
              </button>
              <button
                className="toggle-btn active"
                style={{ backgroundColor: "rgba(0, 147, 204, 0.16)", boxShadow: "0 0 10px rgba(0, 147, 204, 0.25)" }}
                onClick={() => router.push("/replay")}
              >
                RACE REPLAY
              </button>
              <button
                className="toggle-btn"
                onClick={() => router.push("/?mode=addons")}
              >
                ADD-ON LIBRARY
              </button>
              <button
                className="toggle-btn"
                onClick={() => router.push("/?mode=chat")}
              >
                CHATBOT
              </button>
              <button
                className="toggle-btn"
                onClick={() => router.back()}
              >
                BACK
              </button>
            </div>
          </div>
        </div>
      </div>

      <main style={{ minHeight: "100vh", padding: "0 1.5rem 1.5rem", position: "relative", zIndex: 101 }}>
        <RaceReplay />
      </main>
    </div>
  );
}
