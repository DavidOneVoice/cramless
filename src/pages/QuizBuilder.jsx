import { useEffect, useMemo, useRef, useState } from "react";
import { loadState, saveState } from "../lib/storage";
import { extractTextFromPdf } from "../lib/pdfText";
import mammoth from "mammoth";
import { useCountdown } from "../hooks/useCountdown";
import { getQuizMinutes } from "../utils/quizTime";
import QuizBuilderForm from "../components/quiz/QuizBuilderForm";

function getQueryParam(name) {
  const hash = window.location.hash || "";
  const q = hash.split("?")[1] || "";
  const params = new URLSearchParams(q);
  return params.get(name) || "";
}

export default function QuizBuilder() {
  const [state, setState] = useState(() => loadState());

  const quizSets = useMemo(() => state.quizSets || [], [state.quizSets]);
  const courses = useMemo(() => state.courses || [], [state.courses]);

  // Builder form state
  const [title, setTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [fileInfo, setFileInfo] = useState("");
  const [error, setError] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");

  // Quiz settings (kept here to support auto-take)
  const [questionCount, setQuestionCount] = useState(10);
  const [generatingSetId, setGeneratingSetId] = useState(null);

  // Practice state
  const [activeSetId, setActiveSetId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [attemptAnswers, setAttemptAnswers] = useState({});
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

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
      courseId: selectedCourseId || "",
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

    // ✅ Redirect to Quiz Sets page (your router supports aliases, but this is safest)
    window.location.hash = "#/quizSets";
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

      // Save questions + promptHistory
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

  const lastAutoTakeRef = useRef("");

  // ✅ Auto-start quiz when coming from QuizSetDetails route
  useEffect(() => {
    const takeSetId = getQueryParam("takeSetId");
    if (!takeSetId) return;

    if (lastAutoTakeRef.current === takeSetId) return;
    lastAutoTakeRef.current = takeSetId;

    (async () => {
      // Allow settings passed via state.ui (optional)
      const qc = Number(state.ui?.questionCount || questionCount || 10);
      setQuestionCount(qc);

      const questions = await generateWithAI(takeSetId, qc);
      if (!questions.length) return;

      const mins = getQuizMinutes(qc);
      start(mins * 60);
      startPractice(takeSetId);

      // ✅ Clean URL so refresh doesn't auto-trigger again
      window.location.hash = "#/quiz";
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.quizSets]);

  async function onRetake() {
    if (!activeSetId) return;

    const qc = Number(questionCount || 10);
    const questions = await generateWithAI(activeSetId, qc);
    if (!questions.length) return;

    const mins = getQuizMinutes(qc);
    start(mins * 60);
    startPractice(activeSetId);
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
    </div>
  );
}
