import { useEffect, useMemo, useState } from "react";
import { loadState, saveState } from "../lib/storage";
import { extractTextFromPdf } from "../lib/pdfText";
import mammoth from "mammoth";
import { useCountdown } from "../hooks/useCountdown";
import { getQuizMinutes } from "../utils/quizTime";
import QuizBuilderForm from "../components/quiz/QuizBuilderForm";
import QuizControls from "../components/quiz/QuizControls";
import QuizSetsTable from "../components/quiz/QuizSetsTable";
import PracticeMode from "../components/quiz/PracticeMode";

export default function QuizBuilder() {
  const [state, setState] = useState(() => loadState());

  const quizSets = useMemo(() => state.quizSets || [], [state.quizSets]);
  const courses = useMemo(() => state.courses || [], [state.courses]);

  // Builder controls
  const [summarizingSetId, setSummarizingSetId] = useState(null);
  const [questionCount, setQuestionCount] = useState(10);
  const [useAutoTime, setUseAutoTime] = useState(true);
  const [customMinutes, setCustomMinutes] = useState(5);

  // Builder form state
  const [title, setTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [fileInfo, setFileInfo] = useState("");
  const [error, setError] = useState("");
  const [generatingSetId, setGeneratingSetId] = useState(null);
  const [selectedCourseId, setSelectedCourseId] = useState("");

  // Practice state
  const [activeSetId, setActiveSetId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [attemptAnswers, setAttemptAnswers] = useState({});
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  // Attempt review modal state
  const [viewAttempt, setViewAttempt] = useState(null);

  const { secondsLeft, isRunning, start, stop, reset } = useCountdown();

  useEffect(() => {
    saveState(state);
  }, [state]);

  const activeSet = useMemo(
    () => quizSets.find((s) => s.id === activeSetId) || null,
    [quizSets, activeSetId],
  );

  useEffect(() => {
    // If timer runs down mid-quiz, end the quiz
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
  }

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

  async function handleFileUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileInfo(`${file.name} (${Math.round(file.size / 1024)} KB)`);
    setError("");

    const lower = file.name.toLowerCase();

    if (lower.endsWith(".txt")) {
      const text = await file.text();
      setSourceText(text);
      return;
    }

    if (lower.endsWith(".docx")) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        const text = (result.value || "").trim();

        if (!text || text.length < 30) {
          setError(
            "DOCX loaded, but little/no text was found. Try another file or paste text.",
          );
          return;
        }

        setSourceText(text);
        return;
      } catch (err) {
        console.error(err);
        setError("Failed to read DOCX. Please try another file or paste text.");
        return;
      }
    }

    if (lower.endsWith(".pdf")) {
      try {
        setError("Reading PDF…");
        const text = await extractTextFromPdf(file);

        if (!text || text.length < 30) {
          setError(
            "PDF loaded, but little/no selectable text was found. If this PDF is scanned (image-based), we’ll need OCR.",
          );
          return;
        }

        setSourceText(text);
        setError("");
        return;
      } catch (err) {
        console.error("PDF read error:", err);
        setError(`Failed to read PDF: ${err?.message || "Unknown error"}`);
        return;
      }
    }

    setError(
      "Unsupported file type. Please upload a .txt, .docx, or .pdf file.",
    );
  }

  function saveQuizSet() {
    if (!title.trim() || title.trim().length < 3) {
      setError("Please enter a title (min 3 characters).");
      return;
    }

    if (!sourceText.trim() || sourceText.trim().length < 30) {
      setError(
        "Please provide at least 30 characters of course material (upload or paste).",
      );
      return;
    }

    const newSet = {
      id: crypto.randomUUID(),
      title: title.trim(),
      sourceText,
      questions: [],
      summary: "",
      promptHistory: [],
      attempts: [],
      courseId: selectedCourseId || "", // keep consistent type
      createdAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      quizSets: [newSet, ...(prev.quizSets || [])],
    }));

    setTitle("");
    setSourceText("");
    setFileInfo("");
    setSelectedCourseId("");
    setError("");
  }

  function removeSet(id) {
    if (activeSetId === id) exitPractice();
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

      // Save questions + promptHistory so next attempt avoids repeats
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

    const mins = useAutoTime
      ? getQuizMinutes(questionCount)
      : Math.max(1, Number(customMinutes || 1));

    start(mins * 60);
    startPractice(setId);
  }

  function saveAttemptForSet({
    setId,
    score,
    total,
    answers,
    questionsSnapshot,
  }) {
    const takenAt = new Date().toISOString();
    const minutesPlanned = useAutoTime
      ? getQuizMinutes(questionCount)
      : Math.max(1, Number(customMinutes || 1));

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

  return (
    <div>
      <QuizBuilderForm
        title={title}
        setTitle={setTitle}
        sourceText={sourceText}
        setSourceText={setSourceText}
        fileInfo={fileInfo}
        error={error}
        onFileUpload={handleFileUpload}
        onSave={saveQuizSet}
        courses={courses}
        selectedCourseId={selectedCourseId}
        setSelectedCourseId={setSelectedCourseId}
      />

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
        onRetake={async () => {
          if (!activeSetId) return;

          const questions = await generateWithAI(activeSetId, questionCount);
          if (!questions.length) return;

          const mins = useAutoTime
            ? getQuizMinutes(questionCount)
            : Math.max(1, Number(customMinutes || 1));
          start(mins * 60);

          startPractice(activeSetId);
        }}
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
