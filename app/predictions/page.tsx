"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { predictionRepoSummary, predictionScripts, type PredictionScript } from "../../lib/predictions";

function PredictionPill({ label, active, onClick }: { label: string; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "12px 14px",
        borderRadius: "999px",
        border: active ? "1px solid rgba(234, 51, 35, 0.6)" : "1px solid var(--border-light)",
        background: active ? "rgba(234, 51, 35, 0.18)" : "rgba(255,255,255,0.06)",
        color: "var(--text-primary)",
        fontWeight: 800,
        cursor: "pointer",
        textAlign: "left",
      }}
    >
      {label}
    </button>
  );
}

function PredictionPanel({ script }: { script: PredictionScript }) {
  return (
    <article
      className="glass-panel"
      style={{
        padding: "24px",
        borderRadius: "18px",
        display: "grid",
        gap: "14px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
        <div>
          <p style={{ margin: 0, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1.5px", fontSize: "0.75rem" }}>
            Selected Prediction
          </p>
          <h2 style={{ margin: "8px 0 0", fontSize: "1.8rem" }}>{script.title}</h2>
          <p style={{ margin: "6px 0 0", color: "var(--text-secondary)" }}>{script.race}</p>
        </div>
        <div
          style={{
            alignSelf: "start",
            padding: "10px 14px",
            borderRadius: "14px",
            background: "rgba(255,255,255,0.05)",
            border: "1px solid var(--border-light)",
          }}
        >
          <div style={{ color: "var(--text-muted)", fontSize: "0.74rem", textTransform: "uppercase" }}>Winner</div>
          <div style={{ fontSize: "1.4rem", fontWeight: 900 }}>{script.result.winner}</div>
        </div>
      </div>

      <div
        style={{
          padding: "18px",
          borderRadius: "16px",
          background: "rgba(0, 147, 204, 0.08)",
          border: "1px solid rgba(0, 147, 204, 0.22)",
          fontSize: "1.05rem",
          fontWeight: 800,
        }}
      >
        {script.result.headline}
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
        {script.result.podium.map((driver, index) => (
          <span
            key={driver}
            style={{
              padding: "8px 12px",
              borderRadius: "999px",
              background: index === 0 ? "rgba(234, 51, 35, 0.18)" : "rgba(255,255,255,0.06)",
              border: "1px solid var(--border-light)",
              fontWeight: 700,
            }}
          >
            {index + 1}. {driver}
          </span>
        ))}
      </div>

      <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: 1.6 }}>
        {script.result.note}
      </p>
    </article>
  );
}

export default function PredictionsPage() {
  const [selectedId, setSelectedId] = useState(predictionScripts[0]?.id ?? "");
  const selected = useMemo(
    () => predictionScripts.find((script) => script.id === selectedId) ?? predictionScripts[0],
    [selectedId]
  );

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "32px",
        background:
          "radial-gradient(circle at top left, rgba(234, 51, 35, 0.18), transparent 28%), radial-gradient(circle at top right, rgba(0, 147, 204, 0.16), transparent 26%), linear-gradient(180deg, #0b1220 0%, #111a2d 46%, #0a0f1a 100%)",
        color: "var(--text-primary)",
      }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto", display: "grid", gap: "22px" }}>
        <section className="glass-panel" style={{ padding: "28px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
            <div>
              <p style={{ margin: 0, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "1.5px", fontSize: "0.75rem" }}>
                Prediction Hub
              </p>
              <h1 style={{ margin: "10px 0 12px", fontSize: "2.4rem" }}>
                {predictionRepoSummary.title}
              </h1>
              <p style={{ margin: 0, maxWidth: 760, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                Click the next week you want. The page shows only the prediction result, nothing extra.
              </p>
            </div>

            <Link
              href="/?mode=addons"
              style={{
                alignSelf: "start",
                padding: "12px 18px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid var(--border-light)",
                color: "var(--text-primary)",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Back to Add-ons
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px", marginTop: "22px" }}>
            {predictionScripts.map((script) => (
              <PredictionPill
                key={script.id}
                label={`${script.race}`}
                active={script.id === selected.id}
                onClick={() => setSelectedId(script.id)}
              />
            ))}
          </div>
        </section>

        {selected ? <PredictionPanel script={selected} /> : null}

        <section className="glass-panel" style={{ padding: "20px" }}>
          <div style={{ color: "var(--text-muted)", fontSize: "0.78rem", textTransform: "uppercase", letterSpacing: "1px" }}>
            Minimal mode
          </div>
          <p style={{ margin: "8px 0 0", color: "var(--text-secondary)", lineHeight: 1.6 }}>
            The page is intentionally light: just race buttons and the selected prediction. No extra tables, no compare view, no API.
          </p>
        </section>
      </div>
    </main>
  );
}
