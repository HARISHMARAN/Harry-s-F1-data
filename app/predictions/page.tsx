"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { predictionRepoSummary, predictionScripts, type PredictionScript } from "../../lib/predictions";

type ViewMode = "cards" | "compare";
type CategoryFilter = "All" | PredictionScript["category"];
type RaceFilter = "All" | string;

function compareScripts(left: PredictionScript, right: PredictionScript) {
  const leftInputs = new Set(left.inputs);
  const rightInputs = new Set(right.inputs);
  const sharedInputs = left.inputs.filter((input) => rightInputs.has(input));
  const leftOnly = left.inputs.filter((input) => !rightInputs.has(input));
  const rightOnly = right.inputs.filter((input) => !leftInputs.has(input));

  return {
    sharedInputs,
    leftOnly,
    rightOnly,
  };
}

function PredictionCard({ script, highlighted }: { script: PredictionScript; highlighted?: boolean }) {
  return (
    <article
      style={{
        padding: "20px",
        borderRadius: "16px",
        background: highlighted ? "rgba(234, 51, 35, 0.08)" : "rgba(255,255,255,0.04)",
        border: highlighted ? "1px solid rgba(234, 51, 35, 0.38)" : "1px solid var(--border-light)",
        display: "grid",
        gap: "14px",
        boxShadow: highlighted ? "0 0 0 1px rgba(234, 51, 35, 0.12), 0 18px 36px rgba(0, 0, 0, 0.25)" : "none",
      }}
    >
      <div>
        <p style={{ margin: 0, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "1.2px", color: "var(--text-muted)" }}>
          {script.race}
        </p>
        <h2 style={{ margin: "6px 0 0", fontSize: "1.2rem" }}>{script.title}</h2>
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <span
          style={{
            padding: "5px 10px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid var(--border-light)",
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          {script.category}
        </span>
        <span
          style={{
            padding: "5px 10px",
            borderRadius: "999px",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid var(--border-light)",
            fontSize: "0.75rem",
            textTransform: "uppercase",
            letterSpacing: "1px",
          }}
        >
          {script.season}
        </span>
      </div>

      <p style={{ margin: 0, color: "var(--text-secondary)", lineHeight: 1.6 }}>
        {script.summary}
      </p>

      <div>
        <p style={{ margin: "0 0 8px", color: "var(--text-muted)", fontSize: "0.78rem", textTransform: "uppercase" }}>
          Model
        </p>
        <div style={{ fontWeight: 700 }}>{script.model}</div>
      </div>

      <div>
        <p style={{ margin: "0 0 8px", color: "var(--text-muted)", fontSize: "0.78rem", textTransform: "uppercase" }}>
          Inputs
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
          {script.inputs.map((input) => (
            <span
              key={input}
              style={{
                padding: "6px 10px",
                borderRadius: "999px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid var(--border-light)",
                fontSize: "0.8rem",
              }}
            >
              {input}
            </span>
          ))}
        </div>
      </div>

      <div>
        <p style={{ margin: "0 0 8px", color: "var(--text-muted)", fontSize: "0.78rem", textTransform: "uppercase" }}>
          Launch Command
        </p>
        <code style={{ display: "block", fontSize: "0.82rem", wordBreak: "break-word", color: "var(--accent-success)" }}>
          {script.command}
        </code>
      </div>

      <ul style={{ margin: 0, paddingLeft: 18, color: "var(--text-secondary)", lineHeight: 1.5 }}>
        {script.notes.map((note) => (
          <li key={note}>{note}</li>
        ))}
      </ul>
    </article>
  );
}

export default function PredictionsPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryFilter>("All");
  const [race, setRace] = useState<RaceFilter>("All");
  const [mode, setMode] = useState<ViewMode>("cards");
  const [leftId, setLeftId] = useState(predictionScripts[0]?.id ?? "");
  const [rightId, setRightId] = useState(predictionScripts[1]?.id ?? predictionScripts[0]?.id ?? "");

  const filteredScripts = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    return predictionScripts.filter((script) => {
      const matchesCategory = category === "All" || script.category === category;
      const matchesRace = race === "All" || script.race === race;
      const matchesQuery =
        lowered.length === 0 ||
        [script.title, script.race, script.summary, script.model, ...script.inputs, ...script.notes]
          .join(" ")
          .toLowerCase()
          .includes(lowered);
      return matchesCategory && matchesRace && matchesQuery;
    });
  }, [query, category, race]);

  const raceOptions = useMemo(
    () => Array.from(new Set(predictionScripts.map((script) => script.race))),
    []
  );

  const leftScript = predictionScripts.find((script) => script.id === leftId) ?? predictionScripts[0];
  const rightScript = predictionScripts.find((script) => script.id === rightId) ?? predictionScripts[1] ?? predictionScripts[0];
  const comparison = leftScript && rightScript ? compareScripts(leftScript, rightScript) : null;
  const compareOverlap = comparison ? Math.round((comparison.sharedInputs.length / Math.max(leftScript.inputs.length, rightScript.inputs.length, 1)) * 100) : 0;

  const counts = useMemo(() => {
    const forecasts = predictionScripts.filter((script) => script.category === "Forecast").length;
    const analysis = predictionScripts.filter((script) => script.category === "Analysis").length;
    return { total: predictionScripts.length, forecasts, analysis, races: raceOptions.length };
  }, [raceOptions.length]);

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
      <div style={{ maxWidth: 1280, margin: "0 auto", display: "grid", gap: "24px" }}>
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
                {predictionRepoSummary.description}
              </p>
              <p style={{ margin: "12px 0 0", color: "var(--accent-success)", fontWeight: 700 }}>
                Web-only mode: no API endpoint, no job runner, no backend dependency.
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

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "14px", marginTop: "22px" }}>
            <div style={{ padding: "14px 16px", borderRadius: "14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-light)" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "0.76rem", textTransform: "uppercase" }}>Scripts</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>{counts.total}</div>
            </div>
            <div style={{ padding: "14px 16px", borderRadius: "14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-light)" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "0.76rem", textTransform: "uppercase" }}>Forecasts</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>{counts.forecasts}</div>
            </div>
            <div style={{ padding: "14px 16px", borderRadius: "14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-light)" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "0.76rem", textTransform: "uppercase" }}>Analysis</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>{counts.analysis}</div>
            </div>
            <div style={{ padding: "14px 16px", borderRadius: "14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-light)" }}>
              <div style={{ color: "var(--text-muted)", fontSize: "0.76rem", textTransform: "uppercase" }}>Races</div>
              <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>{counts.races}</div>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: "12px",
              marginTop: "20px",
              alignItems: "end",
            }}
          >
            <label style={{ display: "grid", gap: "8px" }}>
              <span style={{ color: "var(--text-muted)", fontSize: "0.78rem", textTransform: "uppercase" }}>Search</span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search scripts, inputs, or notes"
                style={{
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: "1px solid var(--border-light)",
                  background: "rgba(255,255,255,0.06)",
                  color: "var(--text-primary)",
                }}
              />
            </label>

            <label style={{ display: "grid", gap: "8px" }}>
              <span style={{ color: "var(--text-muted)", fontSize: "0.78rem", textTransform: "uppercase" }}>Category</span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value as CategoryFilter)}
                style={{
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: "1px solid var(--border-light)",
                  background: "rgba(255,255,255,0.06)",
                  color: "var(--text-primary)",
                }}
              >
                <option value="All">All</option>
                <option value="Forecast">Forecast</option>
                <option value="Analysis">Analysis</option>
                </select>
            </label>

            <label style={{ display: "grid", gap: "8px" }}>
              <span style={{ color: "var(--text-muted)", fontSize: "0.78rem", textTransform: "uppercase" }}>Race</span>
              <select
                value={race}
                onChange={(event) => setRace(event.target.value)}
                style={{
                  padding: "12px 14px",
                  borderRadius: "12px",
                  border: "1px solid var(--border-light)",
                  background: "rgba(255,255,255,0.06)",
                  color: "var(--text-primary)",
                }}
              >
                <option value="All">All Races</option>
                {raceOptions.map((raceName) => (
                  <option key={raceName} value={raceName}>
                    {raceName}
                  </option>
                ))}
              </select>
            </label>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => setMode("cards")}
                style={{
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: mode === "cards" ? "1px solid rgba(234, 51, 35, 0.6)" : "1px solid var(--border-light)",
                  background: mode === "cards" ? "rgba(234, 51, 35, 0.16)" : "rgba(255,255,255,0.06)",
                  color: "var(--text-primary)",
                  fontWeight: 700,
                }}
              >
                Cards
              </button>
              <button
                type="button"
                onClick={() => setMode("compare")}
                style={{
                  padding: "12px 16px",
                  borderRadius: "12px",
                  border: mode === "compare" ? "1px solid rgba(0, 147, 204, 0.6)" : "1px solid var(--border-light)",
                  background: mode === "compare" ? "rgba(0, 147, 204, 0.16)" : "rgba(255,255,255,0.06)",
                  color: "var(--text-primary)",
                  fontWeight: 700,
                }}
              >
                Compare
              </button>
            </div>
          </div>

          <div style={{ marginTop: "22px", overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "760px" }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--text-muted)", textTransform: "uppercase", fontSize: "0.75rem", letterSpacing: "1px" }}>
                  <th style={{ padding: "10px 12px" }}>Script</th>
                  <th style={{ padding: "10px 12px" }}>Race</th>
                  <th style={{ padding: "10px 12px" }}>Category</th>
                  <th style={{ padding: "10px 12px" }}>Model</th>
                  <th style={{ padding: "10px 12px" }}>Inputs</th>
                </tr>
              </thead>
              <tbody>
                {filteredScripts.map((script) => (
                  <tr key={script.id} style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <td style={{ padding: "12px", fontWeight: 700 }}>{script.title}</td>
                    <td style={{ padding: "12px", color: "var(--text-secondary)" }}>{script.race}</td>
                    <td style={{ padding: "12px" }}>
                      <span
                        style={{
                          padding: "4px 9px",
                          borderRadius: "999px",
                          background: script.category === "Forecast" ? "rgba(234, 51, 35, 0.14)" : "rgba(0, 147, 204, 0.14)",
                          border: "1px solid var(--border-light)",
                          fontSize: "0.75rem",
                          textTransform: "uppercase",
                        }}
                      >
                        {script.category}
                      </span>
                    </td>
                    <td style={{ padding: "12px", color: "var(--text-secondary)" }}>{script.model}</td>
                    <td style={{ padding: "12px", color: "var(--text-secondary)" }}>{script.inputs.length}</td>
                  </tr>
                ))}
                {!filteredScripts.length ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "16px 12px", color: "var(--text-secondary)" }}>
                      No scripts match the current filters.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          {mode === "cards" ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px", marginTop: "24px" }}>
              {filteredScripts.length ? (
                filteredScripts.map((script) => <PredictionCard key={script.id} script={script} />)
              ) : (
                <div style={{ gridColumn: "1 / -1", padding: "22px", borderRadius: "16px", border: "1px solid var(--border-light)", background: "rgba(255,255,255,0.04)", color: "var(--text-secondary)" }}>
                  No scripts match the current filters.
                </div>
              )}
            </div>
          ) : (
            <div style={{ display: "grid", gap: "18px", marginTop: "24px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
                <label style={{ display: "grid", gap: "8px" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.78rem", textTransform: "uppercase" }}>Left Script</span>
                  <select
                    value={leftId}
                    onChange={(event) => setLeftId(event.target.value)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "12px",
                      border: "1px solid var(--border-light)",
                      background: "rgba(255,255,255,0.06)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {predictionScripts.map((script) => (
                      <option key={script.id} value={script.id}>
                        {script.title}
                      </option>
                    ))}
                  </select>
                </label>

                <label style={{ display: "grid", gap: "8px" }}>
                  <span style={{ color: "var(--text-muted)", fontSize: "0.78rem", textTransform: "uppercase" }}>Right Script</span>
                  <select
                    value={rightId}
                    onChange={(event) => setRightId(event.target.value)}
                    style={{
                      padding: "12px 14px",
                      borderRadius: "12px",
                      border: "1px solid var(--border-light)",
                      background: "rgba(255,255,255,0.06)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {predictionScripts.map((script) => (
                      <option key={script.id} value={script.id}>
                        {script.title}
                      </option>
                    ))}
                  </select>
                </label>

                <div style={{ padding: "14px 16px", borderRadius: "14px", background: "rgba(0,147,204,0.1)", border: "1px solid rgba(0,147,204,0.28)" }}>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.76rem", textTransform: "uppercase" }}>Input overlap</div>
                  <div style={{ fontSize: "1.4rem", fontWeight: 800 }}>{compareOverlap}%</div>
                </div>
              </div>

              {comparison && leftScript && rightScript ? (
                <div style={{ display: "grid", gap: "18px" }}>
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "16px" }}>
                    <PredictionCard script={leftScript} highlighted />
                    <PredictionCard script={rightScript} highlighted />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
                    <section style={{ padding: "18px", borderRadius: "16px", border: "1px solid var(--border-light)", background: "rgba(255,255,255,0.04)" }}>
                      <h3 style={{ marginTop: 0 }}>Shared inputs</h3>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {comparison.sharedInputs.length ? comparison.sharedInputs.map((input) => (
                          <span key={input} style={{ padding: "6px 10px", borderRadius: "999px", background: "rgba(0, 147, 204, 0.16)", border: "1px solid rgba(0, 147, 204, 0.3)" }}>
                            {input}
                          </span>
                        )) : (
                          <span style={{ color: "var(--text-secondary)" }}>No shared inputs.</span>
                        )}
                      </div>
                    </section>

                    <section style={{ padding: "18px", borderRadius: "16px", border: "1px solid var(--border-light)", background: "rgba(255,255,255,0.04)" }}>
                      <h3 style={{ marginTop: 0 }}>{leftScript.title} only</h3>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {comparison.leftOnly.length ? comparison.leftOnly.map((input) => (
                          <span key={input} style={{ padding: "6px 10px", borderRadius: "999px", background: "rgba(234, 51, 35, 0.14)", border: "1px solid rgba(234, 51, 35, 0.28)" }}>
                            {input}
                          </span>
                        )) : (
                          <span style={{ color: "var(--text-secondary)" }}>No unique inputs.</span>
                        )}
                      </div>
                    </section>

                    <section style={{ padding: "18px", borderRadius: "16px", border: "1px solid var(--border-light)", background: "rgba(255,255,255,0.04)" }}>
                      <h3 style={{ marginTop: 0 }}>{rightScript.title} only</h3>
                      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                        {comparison.rightOnly.length ? comparison.rightOnly.map((input) => (
                          <span key={input} style={{ padding: "6px 10px", borderRadius: "999px", background: "rgba(255,255,255,0.08)", border: "1px solid var(--border-light)" }}>
                            {input}
                          </span>
                        )) : (
                          <span style={{ color: "var(--text-secondary)" }}>No unique inputs.</span>
                        )}
                      </div>
                    </section>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </section>

        <section className="glass-panel" style={{ padding: "24px" }}>
          <h3 style={{ marginTop: 0, marginBottom: "12px" }}>How it fits the project</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
            <div style={{ padding: "16px", borderRadius: "14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-light)" }}>
              <strong>Dashboard surface</strong>
              <p style={{ marginBottom: 0, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                The add-on is visible in the library and now has its own page in the app.
              </p>
            </div>
            <div style={{ padding: "16px", borderRadius: "14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-light)" }}>
              <strong>Reusable boundary</strong>
              <p style={{ marginBottom: 0, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                Prediction logic stays isolated in `addons/2026_f1_predictions` instead of mixing with replay code.
              </p>
            </div>
            <div style={{ padding: "16px", borderRadius: "14px", background: "rgba(255,255,255,0.04)", border: "1px solid var(--border-light)" }}>
              <strong>Comparison layer</strong>
              <p style={{ marginBottom: 0, color: "var(--text-secondary)", lineHeight: 1.6 }}>
                Filters and compare mode help you reason about the three scripts without leaving the browser.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
