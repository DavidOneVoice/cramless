import { useEffect, useRef } from "react";

export default function PracticeMode({
  activeSetId,
  activeSet,
  currentIndex,
  selectedAnswer,
  setSelectedAnswer,
  attemptAnswers,
  setAttemptAnswers,
  score,
  showResult,
  onNext,
  onExit,
  onRetake,
  secondsLeft,
  onFinishAttempt,
}) {
  // Prevent saving twice for the same attempt
  const savedAttemptRef = useRef(false);
  const lastAttemptKeyRef = useRef("");

  // Reset the "saved" guard whenever a new attempt starts
  useEffect(() => {
    const key = `${activeSetId || ""}:${(activeSet?.questions || []).length}:${String(
      activeSet?.questions?.[0]?.id || "",
    )}`;

    if (key && key !== lastAttemptKeyRef.current) {
      lastAttemptKeyRef.current = key;
      savedAttemptRef.current = false;
    }
  }, [activeSetId, activeSet]);

  // When results show, save attempt once
  useEffect(() => {
    if (!activeSetId) return;
    if (!activeSet) return;
    if (!showResult) return;
    if (savedAttemptRef.current) return;

    savedAttemptRef.current = true;
    onFinishAttempt?.();
  }, [activeSetId, activeSet, showResult, onFinishAttempt]);

  if (!activeSetId || !activeSet) return null;

  const questions = activeSet.questions || [];
  if (!questions.length) return null;

  const currentQuestion = questions[currentIndex];

  function formatTime(sec) {
    const m = Math.floor(sec / 60);
    const s = String(sec % 60).padStart(2, "0");
    return `${m}:${s}`;
  }

  return (
    <div className="card" style={{ marginTop: 20 }}>
      <h3 className="sectionTitle">Practice Mode</h3>

      {!showResult ? (
        <>
          <p className="muted">
            Question {currentIndex + 1} of {questions.length}
          </p>

          <p className="muted" style={{ marginTop: 6 }}>
            Time left: <strong>{formatTime(secondsLeft)}</strong>
          </p>

          <div
            style={{
              marginTop: 10,
              whiteSpace: "pre-line",
              fontWeight: 700,
            }}
          >
            {currentQuestion.prompt}
          </div>

          <div style={{ marginTop: 12, display: "grid", gap: 8 }}>
            {currentQuestion.options.map((opt) => (
              <button
                key={opt}
                className={selectedAnswer === opt ? "primaryBtn" : "navBtn"}
                type="button"
                onClick={() => {
                  setSelectedAnswer(opt);
                  setAttemptAnswers((prev) => ({
                    ...prev,
                    [currentQuestion.id]: opt,
                  }));
                }}
              >
                {opt}
              </button>
            ))}
          </div>

          <div
            style={{
              marginTop: 14,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <button
              className="primaryBtn"
              type="button"
              onClick={onNext}
              disabled={!selectedAnswer}
            >
              Next
            </button>

            <button className="navBtn" type="button" onClick={onExit}>
              Exit
            </button>
          </div>
        </>
      ) : (
        <>
          <h4>
            Your Score: {score} / {questions.length}
          </h4>

          <div style={{ marginTop: 14 }}>
            <h4>Review</h4>

            <div style={{ display: "grid", gap: 12, marginTop: 10 }}>
              {questions.map((q, idx) => {
                const yourAns = attemptAnswers[q.id];
                const correct = yourAns === q.answer;

                return (
                  <div key={q.id} className="card" style={{ padding: 12 }}>
                    <div style={{ fontWeight: 700 }}>
                      {idx + 1}. {q.prompt}
                    </div>

                    <div className="muted" style={{ marginTop: 6 }}>
                      Your answer: <strong>{yourAns || "No answer"}</strong>{" "}
                      {correct ? "✅" : "❌"}
                    </div>

                    {!correct && (
                      <div className="muted" style={{ marginTop: 4 }}>
                        Correct answer: <strong>{q.answer}</strong>
                      </div>
                    )}

                    {q.explanation && (
                      <div className="muted" style={{ marginTop: 6 }}>
                        Explanation: {q.explanation}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
            }}
          >
            <button className="primaryBtn" type="button" onClick={onRetake}>
              Retake Quiz
            </button>

            <button className="navBtn" type="button" onClick={onExit}>
              Exit
            </button>
          </div>
        </>
      )}
    </div>
  );
}
