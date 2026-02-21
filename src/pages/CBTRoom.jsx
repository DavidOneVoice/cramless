import { useEffect, useMemo, useRef, useState } from "react";
import { loadState, saveState } from "../lib/storage";
import { useCountdown } from "../hooks/useCountdown";
import { getQuizMinutes } from "../utils/quizTime";
import PracticeMode from "../components/quiz/PracticeMode";

function getQueryParam(name) {
  const hash = window.location.hash || "";
  const q = hash.split("?")[1] || "";
  const params = new URLSearchParams(q);
  return params.get(name) || "";
}

export default function CBTRoom() {
  const [state, setState] = useState(() => loadState());

  const quizSets = useMemo(() => state.quizSets || [], [state.quizSets]);

  // Practice state
  const [activeSetId, setActiveSetId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [attemptAnswers, setAttemptAnswers] = useState({});
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);

  const { secondsLeft, isRunning, start, stop, reset } = useCountdown();

  useEffect(() => {
    saveState(state);
  }, [state]);

  const activeSet = useMemo(
    () => quizSets.find((s) => s.id === activeSetId) || null,
    [quizSets, activeSetId],
  );

  // end when timer hits 0
  useEffect(() => {
    if (activeSetId && isRunning === false && secondsLeft === 0) {
      if (!showResult) setShowResult(true);
    }
  }, [activeSetId, isRunning, secondsLeft, showResult]);

  function startPractice(setId) {
    setActiveSetId(setId);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setAttemptAnswers({});
    setScore(0);
    setShowResult(false);
  }

  function exitPractice() {
    setActiveSetId(null);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setAttemptAnswers({});
    setScore(0);
    setShowResult(false);
    stop();
    reset();
    // go back to set details
    const sid = getQueryParam("setId") || "";
    window.location.hash = sid ? `#/quizSet?setId=${sid}` : "#/quizSets";
  }

  function handleNext() {
    if (!activeSet) return;
    if (!selectedAnswer) return;

    const q = activeSet.questions[currentIndex];
    if (selectedAnswer === q.answer) setScore((p) => p + 1);

    if (currentIndex + 1 >= activeSet.questions.length) {
      setShowResult(true);
      stop();
      return;
    }

    setCurrentIndex((p) => p + 1);
    setSelectedAnswer(null);
  }

  function saveAttemptForSet({
    setId,
    score,
    total,
    answers,
    questionsSnapshot,
  }) {
    const takenAt = new Date().toISOString();
    const minutesPlanned = getQuizMinutes(total);

    const attempt = {
      id: crypto.randomUUID(),
      takenAt,
      questionCount: total,
      minutesPlanned,
      score,
      total,
      answers,
      questionsSnapshot,
    };

    setState((prev) => ({
      ...prev,
      quizSets: (prev.quizSets || []).map((set) => {
        if (set.id !== setId) return set;

        const oldAttempts = Array.isArray(set.attempts) ? set.attempts : [];
        const nextAttempts = [attempt, ...oldAttempts].slice(0, 4);

        return { ...set, attempts: nextAttempts };
      }),
    }));
  }

  async function generateWithAI(setId, count = 10) {
    const target = (state.quizSets || []).find((x) => x.id === setId);
    if (!target) return [];

    try {
      setGenerating(true);
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

      // save questions + promptHistory
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
      setGenerating(false);
    }
  }

  const autoStartRef = useRef("");

  // ✅ Auto-start when entering CBT room
  useEffect(() => {
    const setId = getQueryParam("setId");
    if (!setId) {
      setError("No quiz set selected.");
      return;
    }

    // stop double-run
    if (autoStartRef.current === setId) return;
    autoStartRef.current = setId;

    (async () => {
      // use query param count if provided, else default 10
      const count = Number(getQueryParam("count") || 10);

      const questions = await generateWithAI(setId, count);
      if (!questions.length) return;

      const mins = getQuizMinutes(count);
      start(mins * 60);
      startPractice(setId);

      // optional: clean URL so refresh won't regenerate endlessly
      window.location.hash = `#/cbt?setId=${setId}`;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.quizSets]);

  async function onRetake() {
    if (!activeSetId) return;
    const count = Number(getQueryParam("count") || 10);

    const questions = await generateWithAI(activeSetId, count);
    if (!questions.length) return;

    const mins = getQuizMinutes(count);
    start(mins * 60);
    startPractice(activeSetId);
  }

  // If not started yet, show a simple loading card
  if (!activeSetId || !activeSet) {
    return (
      <div className="card">
        <h2 className="sectionTitle">CBT Room</h2>
        <p className="muted">
          {error || (generating ? "Preparing your quiz…" : "Loading…")}
        </p>

        <button
          className="navBtn"
          type="button"
          onClick={() => (window.location.hash = "#/quizSets")}
        >
          Back to Quiz Sets
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Optional header card */}
      <div className="card" style={{ marginBottom: 14 }}>
        <h2 className="sectionTitle">CBT Room</h2>
        <p className="muted" style={{ marginTop: 6 }}>
          <strong>{activeSet.title}</strong>
          {generating ? " • Generating…" : ""}
        </p>
        {error && (
          <div className="errorBox" style={{ marginTop: 10 }}>
            {error}
          </div>
        )}
      </div>

      <PracticeMode
        activeSet={activeSet}
        currentIndex={currentIndex}
        selectedAnswer={selectedAnswer}
        setSelectedAnswer={setSelectedAnswer}
        attemptAnswers={attemptAnswers}
        setAttemptAnswers={setAttemptAnswers}
        score={score}
        showResult={showResult}
        onNext={handleNext}
        onExit={exitPractice}
        onRetake={onRetake}
        secondsLeft={secondsLeft}
        activeSetId={activeSetId}
        onFinishAttempt={() => {
          if (!activeSetId || !activeSet) return;
          saveAttemptForSet({
            setId: activeSetId,
            score,
            total: (activeSet.questions || []).length,
            answers: attemptAnswers,
            questionsSnapshot: activeSet.questions || [],
          });
        }}
      />
    </div>
  );
}
