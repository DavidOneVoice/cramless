import { useEffect, useMemo, useState } from "react";
import { loadState, saveState } from "../lib/storage";
import QuizSetsTable from "../components/quiz/QuizSetsTable";
import ConfirmModal from "../components/common/ConfirmModal";

export default function QuizSets() {
  const [state, setState] = useState(() => loadState());
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);

  useEffect(() => {
    function onHashChange() {
      setState(loadState());
    }
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const quizSets = useMemo(() => state.quizSets || [], [state.quizSets]);

  function openSet(setId) {
    window.location.hash = `#/quizSet?setId=${setId}`;
  }

  function confirmRemove(setId) {
    setConfirmRemoveId(setId);
  }

  function handleRemoveConfirmed() {
    if (!confirmRemoveId) return;

    setState((prev) => ({
      ...prev,
      quizSets: (prev.quizSets || []).filter((s) => s.id !== confirmRemoveId),
    }));

    setConfirmRemoveId(null);
  }

  return (
    <div>
      <div className="card">
        <h2 className="sectionTitle">Quiz Sets</h2>
        <p className="muted">
          Open a set to take quizzes, manage summaries, and view attempts.
        </p>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button
            className="primaryBtn"
            type="button"
            onClick={() => (window.location.hash = "#/quiz")}
          >
            + Create Quiz Set
          </button>

          <button
            className="navBtn"
            type="button"
            onClick={() => (window.location.hash = "#/summaries")}
          >
            Go to Summaries
          </button>
        </div>
      </div>

      <QuizSetsTable
        quizSets={quizSets}
        onOpenSet={openSet}
        onRemoveSet={confirmRemove}
      />

      <ConfirmModal
        open={!!confirmRemoveId}
        title="Delete Quiz Set?"
        message="This will permanently remove this quiz set, its questions, summary, and attempts from this browser."
        confirmText="Yes, delete it"
        cancelText="Cancel"
        danger
        onCancel={() => setConfirmRemoveId(null)}
        onConfirm={handleRemoveConfirmed}
      />
    </div>
  );
}
