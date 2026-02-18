import { useEffect, useMemo, useState } from "react";
import { loadState } from "../lib/storage";

function getSetIdFromHash() {
  const raw = window.location.hash || "";
  const qIndex = raw.indexOf("?");
  if (qIndex === -1) return "";
  const qs = raw.slice(qIndex + 1);
  const params = new URLSearchParams(qs);
  return params.get("setId") || "";
}

export default function Summaries() {
  const [state, setState] = useState(() => loadState());
  const [openSetId, setOpenSetId] = useState("");

  useEffect(() => {
    function syncFromStorage() {
      setState(loadState());
      const id = getSetIdFromHash();
      if (id) setOpenSetId(id);
    }

    syncFromStorage(); // run on mount
    window.addEventListener("hashchange", syncFromStorage);
    return () => window.removeEventListener("hashchange", syncFromStorage);
  }, []);

  const quizSets = useMemo(() => state.quizSets || [], [state.quizSets]);

  const summarizedSets = useMemo(() => {
    return quizSets
      .filter(
        (s) => typeof s.summary === "string" && s.summary.trim().length > 0,
      )
      .sort((a, b) =>
        String(b.createdAt || "").localeCompare(String(a.createdAt || "")),
      );
  }, [quizSets]);

  const openSet = useMemo(() => {
    return summarizedSets.find((s) => s.id === openSetId) || null;
  }, [summarizedSets, openSetId]);

  return (
    <div className="card">
      <h2 className="sectionTitle">Summaries</h2>
      <p className="muted">
        All generated summaries are saved locally in this browser.
      </p>

      <div
        style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 10 }}
      >
        <button
          className="navBtn"
          type="button"
          onClick={() => (window.location.hash = "#/quiz")}
        >
          Back to Quiz Builder
        </button>
      </div>

      <div style={{ marginTop: 14 }}>
        {summarizedSets.length === 0 ? (
          <p className="muted">
            No summaries yet. Go to Quiz Builder and click “Generate Summary”.
          </p>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {summarizedSets.map((s) => (
              <div key={s.id} className="card" style={{ padding: 12 }}>
                <div style={{ fontWeight: 800 }}>{s.title}</div>

                <div className="muted" style={{ marginTop: 6 }}>
                  Summary ready
                </div>

                <div
                  style={{
                    marginTop: 10,
                    display: "flex",
                    gap: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <button
                    className="primaryBtn"
                    type="button"
                    onClick={() => setOpenSetId(s.id)}
                  >
                    View Summary
                  </button>

                  <button
                    className="navBtn"
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(s.summary || "");
                      alert("Summary copied ✅");
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {openSet && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
          onClick={() => setOpenSetId("")}
        >
          <div
            className="card"
            style={{
              width: "min(980px, 100%)",
              maxHeight: "min(85vh, 900px)",
              overflow: "auto",
              padding: 16,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                gap: 10,
              }}
            >
              <div>
                <div style={{ fontWeight: 900, fontSize: 18 }}>
                  {openSet.title}
                </div>
                <div className="muted" style={{ marginTop: 4 }}>
                  Summary
                </div>
              </div>

              <button
                className="navBtn"
                type="button"
                onClick={() => setOpenSetId("")}
              >
                Close
              </button>
            </div>

            <div style={{ marginTop: 12, whiteSpace: "pre-line" }}>
              {openSet.summary}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
