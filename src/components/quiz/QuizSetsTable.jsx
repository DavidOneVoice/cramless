export default function QuizSetsTable({
  quizSets,
  generatingSetId,
  summarizingSetId,
  onTakeQuiz,
  onSummarize,
  onRemoveSet,
  onViewAttempt,
  onDeleteAttempt,
}) {
  function fmtDate(iso) {
    try {
      const d = new Date(iso);
      return d.toLocaleString();
    } catch {
      return iso;
    }
  }

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <h3 className="sectionTitle">Saved Quiz Sets</h3>

      {quizSets.length === 0 ? (
        <p className="muted">No saved sets yet.</p>
      ) : (
        <div className="table">
          <div className="row head">
            <div>Title</div>
            <div>Status</div>
            <div>Actions</div>
            <div></div>
          </div>

          {quizSets.map((s) => {
            const attempts = Array.isArray(s.attempts) ? s.attempts : [];
            const best = attempts.reduce(
              (acc, a) => Math.max(acc, Number(a.score || 0)),
              0,
            );
            const lastAttempt = attempts[0] || null;

            return (
              <div key={s.id}>
                <div className="row">
                  <div>{s.title}</div>

                  <div className="muted">
                    {(s.questions || []).length > 0
                      ? `${s.questions.length} questions ready`
                      : "No questions yet"}
                    {s.summary ? " • Summary ready" : ""}
                    {attempts.length ? ` • ${attempts.length} attempt(s)` : ""}
                    {attempts.length
                      ? ` • Best: ${best}/${lastAttempt?.total || "-"}`
                      : ""}
                    {lastAttempt?.takenAt
                      ? ` • Last: ${fmtDate(lastAttempt.takenAt)}`
                      : ""}
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                    <button
                      className="primaryBtn"
                      type="button"
                      disabled={generatingSetId === s.id}
                      onClick={() => onTakeQuiz(s.id)}
                    >
                      {generatingSetId === s.id ? "Generating…" : "Take Quiz"}
                    </button>

                    <button
                      className="navBtn"
                      type="button"
                      disabled={summarizingSetId === s.id}
                      onClick={() => onSummarize(s.id)}
                    >
                      {summarizingSetId === s.id
                        ? "Summarizing…"
                        : "Generate Summary"}
                    </button>
                    {s.summary && (
                      <button
                        className="navBtn"
                        type="button"
                        onClick={() =>
                          (window.location.hash = `#/summaries?setId=${s.id}`)
                        }
                      >
                        View Summary
                      </button>
                    )}

                    {attempts.length > 0 && (
                      <button
                        className="dangerBtn"
                        type="button"
                        onClick={() => onDeleteAttempt(s.id, "__ALL__")}
                      >
                        Clear Attempts
                      </button>
                    )}
                  </div>

                  <div className="right">
                    <button
                      className="dangerBtn"
                      type="button"
                      onClick={() => onRemoveSet(s.id)}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {attempts.length > 0 && (
                  <div className="card" style={{ marginTop: 8, padding: 12 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>
                      Recent Attempts (last {Math.min(4, attempts.length)})
                    </div>

                    <div style={{ display: "grid", gap: 8 }}>
                      {attempts.map((a, idx) => (
                        <div
                          key={a.id}
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "center",
                            justifyContent: "space-between",
                            flexWrap: "wrap",
                            border: "1px solid #eee",
                            borderRadius: 12,
                            padding: 10,
                          }}
                        >
                          <div className="muted" style={{ minWidth: 240 }}>
                            <div style={{ fontWeight: 700, opacity: 0.9 }}>
                              Attempt #{attempts.length - idx}
                            </div>
                            <div>{fmtDate(a.takenAt)}</div>
                          </div>

                          <div className="muted" style={{ minWidth: 220 }}>
                            Score:{" "}
                            <strong>
                              {a.score} / {a.total}
                            </strong>{" "}
                            • Time:{" "}
                            <strong>{a.minutesPlanned || "-"} mins</strong>
                          </div>

                          <div style={{ display: "flex", gap: 8 }}>
                            <button
                              className="navBtn"
                              type="button"
                              onClick={() => onViewAttempt(s.id, a.id)}
                            >
                              View
                            </button>

                            <button
                              className="dangerBtn"
                              type="button"
                              onClick={() => onDeleteAttempt(s.id, a.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <p className="footerNote" style={{ marginTop: 10 }}>
                      Attempts are stored locally in this browser.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="footerNote">
        Tip: Generate a Summary for quick revision, or Take Quiz for MCQs.
      </p>
    </div>
  );
}
