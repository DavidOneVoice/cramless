import { useEffect, useMemo, useState } from "react";
import { loadState, saveState } from "../lib/storage";
import ConfirmModal from "../components/common/ConfirmModal";

function getQueryParam(name) {
  const hash = window.location.hash || "";
  const q = hash.split("?")[1] || "";
  const params = new URLSearchParams(q);
  return params.get(name) || "";
}

function fmtDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function QuizSetDetails() {
  const [state, setState] = useState(() => loadState());
  const setId = getQueryParam("setId");

  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    saveState(state);
  }, [state]);

  const set = useMemo(() => {
    return (state.quizSets || []).find((s) => s.id === setId) || null;
  }, [state.quizSets, setId]);

  const attempts = Array.isArray(set?.attempts) ? set.attempts : [];
  const best = attempts.reduce(
    (acc, a) => Math.max(acc, Number(a.score || 0)),
    0,
  );
  const lastAttempt = attempts[0] || null;

  function go(to) {
    window.location.hash = `#/${to}`;
  }

  function goToSummaries() {
    window.location.hash = `#/summaries?setId=${setId}`;
  }

  async function generateSummary() {
    if (!set) return;

    // if already exists, just open it
    if (set.summary) {
      goToSummaries();
      return;
    }

    try {
      setBusy(true);
      setError("");

      const r = await fetch("http://localhost:5050/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: set.title, sourceText: set.sourceText }),
      });

      const raw = await r.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { error: raw || "Server returned a non-JSON response." };
      }

      if (!r.ok) {
        setError(data.error || "Summary failed.");
        return;
      }

      const summary = String(data.summary || "").trim();
      if (!summary) {
        setError("AI returned an empty summary.");
        return;
      }

      setState((prev) => ({
        ...prev,
        quizSets: (prev.quizSets || []).map((x) =>
          x.id === setId ? { ...x, summary } : x,
        ),
      }));

      goToSummaries();
    } catch (e) {
      setError(e?.message || "Summary failed.");
    } finally {
      setBusy(false);
    }
  }

  async function takeQuiz() {
    if (!set) return;
    window.location.hash = `#/cbt?setId=${setId}&count=10`;
  }

  function clearAttempts() {
    if (!set) return;
    setConfirmClearOpen(true);
  }

  function handleClearConfirmed() {
    if (!set) return;

    setState((prev) => ({
      ...prev,
      quizSets: (prev.quizSets || []).map((x) =>
        x.id === setId ? { ...x, attempts: [] } : x,
      ),
    }));

    setConfirmClearOpen(false);
  }

  if (!setId) {
    return (
      <div className="card">
        <h2 className="sectionTitle">Quiz Set Details</h2>
        <p className="muted">No set selected.</p>
        <button className="navBtn" type="button" onClick={() => go("quizSets")}>
          Back to Quiz Sets
        </button>
      </div>
    );
  }

  if (!set) {
    return (
      <div className="card">
        <h2 className="sectionTitle">Quiz Set Details</h2>
        <p className="muted">Set not found (maybe deleted).</p>
        <button className="navBtn" type="button" onClick={() => go("quizSets")}>
          Back to Quiz Sets
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <h2 className="sectionTitle">{set.title}</h2>

      {/* Status */}
      <div className="muted" style={{ marginTop: 6 }}>
        {(set.questions || []).length
          ? `${set.questions.length} questions ready`
          : "No questions yet"}
        {set.summary ? " • Summary ready" : " • No summary yet"}
        {attempts.length ? ` • ${attempts.length} attempt(s)` : ""}
        {attempts.length ? ` • Best: ${best}/${lastAttempt?.total || "-"}` : ""}
        {lastAttempt?.takenAt ? ` • Last: ${fmtDate(lastAttempt.takenAt)}` : ""}
      </div>

      {error && (
        <div className="errorBox" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}

      {/* Actions */}
      <div
        style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}
      >
        <button
          className="primaryBtn"
          type="button"
          onClick={takeQuiz}
          disabled={busy}
        >
          Take Quiz
        </button>

        <button
          className="navBtn"
          type="button"
          onClick={generateSummary}
          disabled={busy}
        >
          {busy
            ? "Working..."
            : set.summary
              ? "View Summary"
              : "Generate Summary"}
        </button>

        {attempts.length > 0 && (
          <button
            className="dangerBtn"
            type="button"
            onClick={clearAttempts}
            disabled={busy}
          >
            Clear Attempts
          </button>
        )}

        <button
          className="navBtn"
          type="button"
          onClick={() => go("quizSets")}
          disabled={busy}
        >
          Back to Quiz Sets
        </button>
      </div>

      {/* Attempts */}
      <div className="card" style={{ marginTop: 14, padding: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>Recent Attempts</div>

        {attempts.length === 0 ? (
          <p className="muted">No attempts yet.</p>
        ) : (
          <div style={{ display: "grid", gap: 10 }}>
            {attempts.slice(0, 4).map((a, idx) => (
              <div
                key={a.id}
                style={{
                  border: "1px solid #eee",
                  borderRadius: 12,
                  padding: 10,
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <div className="muted">
                  <div style={{ fontWeight: 700, opacity: 0.9 }}>
                    Attempt #{attempts.length - idx}
                  </div>
                  <div>{fmtDate(a.takenAt)}</div>
                </div>

                <div className="muted">
                  Score:{" "}
                  <strong>
                    {a.score} / {a.total}
                  </strong>{" "}
                  • Time: <strong>{a.minutesPlanned || "-"} mins</strong>
                </div>
              </div>
            ))}
          </div>
        )}

        <p className="footerNote" style={{ marginTop: 10 }}>
          Attempts are stored locally in this browser.
        </p>
      </div>

      <ConfirmModal
        open={confirmClearOpen}
        title="Clear attempts?"
        message="This will delete all attempts for this quiz set in this browser. This cannot be undone."
        confirmText="Yes, clear"
        cancelText="Cancel"
        danger
        onCancel={() => setConfirmClearOpen(false)}
        onConfirm={handleClearConfirmed}
      />
    </div>
  );
}
