export default function QuizSetsTable({
  quizSets,
  generatingSetId,
  onTakeQuiz,
  onRemoveSet,
}) {
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

          {quizSets.map((s) => (
            <div className="row" key={s.id}>
              <div>{s.title}</div>

              <div className="muted">
                {(s.questions || []).length > 0
                  ? `${s.questions.length} questions ready`
                  : "No questions yet"}
              </div>

              <div>
                <button
                  className="primaryBtn"
                  type="button"
                  disabled={generatingSetId === s.id}
                  onClick={() => onTakeQuiz(s.id)}
                >
                  {generatingSetId === s.id ? "Generating…" : "Take Quiz"}
                </button>
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
          ))}
        </div>
      )}

      <p className="footerNote">
        Tip: “Take Quiz” generates fresh MCQs using AI from your saved material.
      </p>
    </div>
  );
}
