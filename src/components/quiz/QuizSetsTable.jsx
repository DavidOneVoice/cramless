import "./QuizSetsTable.css";

export default function QuizSetsTable({
  quizSets = [],
  onOpenSet,
  onRemoveSet,
}) {
  return (
    <section className="qstCard">
      <div className="qstTop">
        <h3 className="qstTitle">Saved Sets</h3>
        <div className="qstCount">
          {quizSets.length} set{quizSets.length === 1 ? "" : "s"}
        </div>
      </div>

      {quizSets.length === 0 ? (
        <div className="qstEmpty">
          <div className="qstEmptyIcon" aria-hidden="true" />
          <div className="qstEmptyText">
            <div className="qstEmptyTitle">No saved sets yet</div>
            <div className="qstEmptySub">
              Create a quiz set to generate MCQs anytime.
            </div>
          </div>
        </div>
      ) : (
        <div className="qstTable" role="table" aria-label="Quiz sets table">
          <div className="qstRow qstHead" role="row">
            <div role="columnheader">Title</div>
            <div role="columnheader">Actions</div>
          </div>

          {quizSets.map((s) => (
            <div className="qstRow" role="row" key={s.id}>
              <div className="qstName" role="cell">
                {s.title}
              </div>

              <div className="qstActions" role="cell">
                <button
                  className="qstOpen"
                  type="button"
                  onClick={() => onOpenSet?.(s.id)}
                >
                  Open
                </button>

                <button
                  className="qstRemove"
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

      <p className="qstFooter">
        Open a set to take quiz, view attempts, and manage summaries.
      </p>
    </section>
  );
}
