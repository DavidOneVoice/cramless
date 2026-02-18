import { useEffect, useMemo, useState } from "react";
import { loadState, saveState } from "../lib/storage";
import { getQuizMinutes } from "../utils/quizTime";
import QuizControls from "../components/quiz/QuizControls";
import QuizSetsTable from "../components/quiz/QuizSetsTable";

export default function QuizSets() {
  const [state, setState] = useState(() => loadState());

  const quizSets = useMemo(() => state.quizSets || [], [state.quizSets]);

  const [generatingSetId, setGeneratingSetId] = useState(null);
  const [summarizingSetId, setSummarizingSetId] = useState(null);
  const [error, setError] = useState("");

  // quiz settings UI (belongs here now)
  const [questionCount, setQuestionCount] = useState(10);
  const [useAutoTime, setUseAutoTime] = useState(true);
  const [customMinutes, setCustomMinutes] = useState(5);

  // Attempt review modal state (moved here)
  const [viewAttempt, setViewAttempt] = useState(null);

  // keep state synced across hash navigation
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

  function onViewAttempt(setId, attemptId) {
    setViewAttempt({ setId, attemptId });
  }

  function onDeleteAttempt(setId, attemptId) {
    setState((prev) => ({
      ...prev,
      quizSets: (prev.quizSets || []).map((set) => {
        if (set.id !== setId) return set;

        if (attemptId === "__ALL__") {
          return { ...set, attempts: [] };
        }

        const attempts = Array.isArray(set.attempts) ? set.attempts : [];
        return { ...set, attempts: attempts.filter((a) => a.id !== attemptId) };
      }),
    }));

    setViewAttempt((prev) => {
      if (!prev) return prev;
      if (prev.setId !== setId) return prev;
      if (attemptId === "__ALL__") return null;
      return prev.attemptId === attemptId ? null : prev;
    });
  }

  function removeSet(id) {
    setState((prev) => ({
      ...prev,
      quizSets: (prev.quizSets || []).filter((s) => s.id !== id),
    }));
  }

  async function generateWithAI(setId, count = 10) {
    if (generatingSetId === setId) return [];

    const target = (state.quizSets || []).find((x) => x.id === setId);
    if (!target) return [];

    try {
      setGeneratingSetId(setId);
      setError("Generating quiz with AI…");

      const r = await fetch("http://localhost:5050/api/generate-mcqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: target.title,
          sourceText: target.sourceText,
          count,
          difficulty: "mixed",
          nonce: crypto.randomUUID(),
          avoid: (target.promptHistory || target.questions || [])
            .map((q) => (typeof q === "string" ? q : q.prompt))
            .filter(Boolean)
            .slice(0, 60),
        }),
      });

      const raw = await r.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { error: raw || "Server returned a non-JSON response." };
      }

      if (!r.ok) {
        setError(data.error || `AI generation failed (HTTP ${r.status}).`);
        return [];
      }

      const questions = Array.isArray(data.questions) ? data.questions : [];
      if (!questions.length) {
        setError("AI returned no questions. Try uploading more material.");
        return [];
      }

      const looksValid = questions.every(
        (q) =>
          q &&
          typeof q.prompt === "string" &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          typeof q.answer === "string",
      );

      if (!looksValid) {
        setError("AI returned questions in an unexpected format. Try again.");
        return [];
      }

      setState((prev) => ({
        ...prev,
        quizSets: (prev.quizSets || []).map((set) => {
          if (set.id !== setId) return set;

          const newPrompts = questions.map((q) => q.prompt).filter(Boolean);
          const oldHistory = Array.isArray(set.promptHistory)
            ? set.promptHistory
            : [];

          return {
            ...set,
            questions,
            promptHistory: [...newPrompts, ...oldHistory].slice(0, 140),
          };
        }),
      }));

      setError("");
      return questions;
    } catch (err) {
      console.error(err);
      setError(err?.message || "AI generation failed.");
      return [];
    } finally {
      setGeneratingSetId(null);
    }
  }

  async function summarizeWithAI(setId) {
    if (summarizingSetId === setId) return "";

    const target = (state.quizSets || []).find((x) => x.id === setId);
    if (!target) return "";

    try {
      setSummarizingSetId(setId);
      setError("Generating summary…");

      const r = await fetch("http://localhost:5050/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: target.title,
          sourceText: target.sourceText,
        }),
      });

      const raw = await r.text();
      let data = {};
      try {
        data = raw ? JSON.parse(raw) : {};
      } catch {
        data = { error: raw || "Server returned a non-JSON response." };
      }

      if (!r.ok) {
        setError(data.error || `Summary failed (HTTP ${r.status}).`);
        return "";
      }

      const summary = String(data.summary || "").trim();
      if (!summary) {
        setError("AI returned an empty summary. Try again.");
        return "";
      }

      setState((prev) => ({
        ...prev,
        quizSets: (prev.quizSets || []).map((set) =>
          set.id === setId ? { ...set, summary } : set,
        ),
      }));

      setError("");
      setTimeout(() => {
        window.location.hash = `#/summaries?setId=${setId}`;
      }, 0);

      return summary;
    } catch (err) {
      console.error(err);
      setError(err?.message || "Summary generation failed.");
      return "";
    } finally {
      setSummarizingSetId(null);
    }
  }

  async function onTakeQuiz(setId) {
    const questions = await generateWithAI(setId, questionCount);
    if (!questions.length) return;

    // store timer settings into ui so Practice page can use it later (optional)
    const mins = useAutoTime
      ? getQuizMinutes(questionCount)
      : Math.max(1, Number(customMinutes || 1));

    setState((prev) => ({
      ...prev,
      ui: {
        ...(prev.ui || {}),
        activeSetId: setId,
        questionCount,
        minutesPlanned: mins,
      },
    }));

    // go to quiz builder page to practice (your routing already supports hash pages)
    window.location.hash = "#/quiz";
  }

  return (
    <div>
      <div className="card">
        <h2 className="sectionTitle">Quiz Sets</h2>
        <p className="muted">
          Your saved quiz sets live here. Generate quizzes, summaries, and
          review attempts.
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

        {error && (
          <div className="errorBox" style={{ marginTop: 12 }}>
            {error}
          </div>
        )}
      </div>

      <QuizControls
        questionCount={questionCount}
        setQuestionCount={setQuestionCount}
        useAutoTime={useAutoTime}
        setUseAutoTime={setUseAutoTime}
        customMinutes={customMinutes}
        setCustomMinutes={setCustomMinutes}
      />

      <QuizSetsTable
        quizSets={quizSets}
        generatingSetId={generatingSetId}
        summarizingSetId={summarizingSetId}
        onTakeQuiz={onTakeQuiz}
        onSummarize={summarizeWithAI}
        onRemoveSet={removeSet}
        onViewAttempt={onViewAttempt}
        onDeleteAttempt={onDeleteAttempt}
      />

      {viewAttempt && (
        <div className="card" style={{ marginTop: 14 }}>
          <h3 className="sectionTitle">Attempt Review</h3>

          {(() => {
            const set = quizSets.find((s) => s.id === viewAttempt.setId);
            const attempt = (set?.attempts || []).find(
              (a) => a.id === viewAttempt.attemptId,
            );

            if (!set || !attempt) {
              return <p className="muted">Attempt not found.</p>;
            }

            const qs = attempt.questionsSnapshot || [];
            const ans = attempt.answers || {};

            return (
              <>
                <p className="muted">
                  <strong>{set.title}</strong> • Score{" "}
                  <strong>
                    {attempt.score} / {attempt.total}
                  </strong>{" "}
                  • Time <strong>{attempt.minutesPlanned} mins</strong>
                </p>

                <div style={{ marginTop: 12, display: "grid", gap: 12 }}>
                  {qs.map((q, idx) => {
                    const yourAns = ans[q.id];
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

                <div style={{ marginTop: 12 }}>
                  <button
                    className="navBtn"
                    type="button"
                    onClick={() => setViewAttempt(null)}
                  >
                    Close Review
                  </button>
                </div>
              </>
            );
          })()}
        </div>
      )}
    </div>
  );
}
