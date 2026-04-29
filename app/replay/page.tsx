"use client";

import { useRouter } from "next/navigation";
import Header from "../../src/components/Header";
import RaceReplay from "../../src/components/RaceReplay";
import { DASHBOARD_TITLE } from "../../src/constants";

export default function ReplayPage() {
  const router = useRouter();

  return (
    <div className="app-container" style={{ minHeight: "100vh" }}>
      <div style={{ position: "relative", zIndex: 300, pointerEvents: "none", width: "100%" }}>
        <div style={{ pointerEvents: "auto" }}>
          <div className="top-placeholder">
            <div className="mode-toggle">
              <button
                className="toggle-btn"
                onClick={() => router.push("/?mode=live")}
              >
                Live Telemetry
              </button>
              <button
                className="toggle-btn"
                onClick={() => router.push("/?mode=historical")}
              >
                Historical Archive
              </button>
              <button
                className="toggle-btn active-hist"
                onClick={() => router.push("/replay")}
              >
                Race Replay
              </button>
              <button
                className="toggle-btn"
                onClick={() => router.push("/?mode=addons")}
              >
                Add-on Library
              </button>
              <button
                className="toggle-btn"
                onClick={() => router.push("/?mode=chat")}
              >
                Chatbot
              </button>
              <button
                className="toggle-btn"
                onClick={() => router.back()}
              >
                Back
              </button>
            </div>
          </div>

          <Header sessionName={`${DASHBOARD_TITLE} Replay`} isLive={false} />
        </div>
      </div>

      <main className="replay-page-main" style={{ minHeight: "100vh", position: "relative", zIndex: 200 }}>
        <RaceReplay />
      </main>
    </div>
  );
}
