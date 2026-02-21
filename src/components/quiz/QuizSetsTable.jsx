export default function QuizSetsTable({
  quizSets = [],
  onOpenSet,
  onRemoveSet,
}) {
  return (
    <div className="card" style={{ marginTop: 14 }}>
      <h3 className="sectionTitle">Quiz Sets</h3>

      {quizSets.length === 0 ? (
        <p className="muted">No saved sets yet.</p>
      ) : (
        <div className="table">
          <div className="row head">
            <div>Title</div>
            <div>Actions</div>
          </div>

          {quizSets.map((s) => (
            <div className="row" key={s.id}>
              <div style={{ fontWeight: 700 }}>{s.title}</div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="primaryBtn"
                  type="button"
                  onClick={() => onOpenSet?.(s.id)}
                >
                  Open
                </button>

                <button
                  className="dangerBtn"
                  type="button"
                  onClick={() => onRemoveSet?.(s.id)}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="footerNote">
        Open a set to take quiz, view attempts, and manage summaries.
      </p>
    </div>
  );
}
