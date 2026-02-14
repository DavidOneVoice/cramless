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

  // Controls
  const [questionCount, setQuestionCount] = useState(10);
  const [useAutoTime, setUseAutoTime] = useState(true);
  const [customMinutes, setCustomMinutes] = useState(5);

  // Builder
  const [title, setTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [fileInfo, setFileInfo] = useState("");
  const [error, setError] = useState("");

  // AI loading (per set)
  const [generatingSetId, setGeneratingSetId] = useState(null);

  // Practice
  const [activeSetId, setActiveSetId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [attemptAnswers, setAttemptAnswers] = useState({});
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  // Timer
  const { secondsLeft, isRunning, start, stop, reset } = useCountdown();

  useEffect(() => {
    saveState(state);
  }, [state]);

  // Auto-finish when timer ends
  useEffect(() => {
    if (activeSetId && isRunning === false && secondsLeft === 0) {
      // If timer ran down while a quiz is active, show results
      // (This triggers when countdown stops at 0)
      // Only flip if currently mid-quiz.
      if (!showResult) setShowResult(true);
    }
  }, [activeSetId, isRunning, secondsLeft, showResult]);

  const activeSet = useMemo(
    () => quizSets.find((s) => s.id === activeSetId) || null,
    [quizSets, activeSetId],
  );

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
      createdAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      quizSets: [newSet, ...(prev.quizSets || [])],
    }));

    setTitle("");
    setSourceText("");
    setFileInfo("");
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
        quizSets: (prev.quizSets || []).map((set) =>
          set.id === setId ? { ...set, questions } : set,
        ),
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

  async function onTakeQuiz(setId) {
    const questions = await generateWithAI(setId, questionCount);
    if (!questions.length) return;

    const mins = useAutoTime
      ? getQuizMinutes(questionCount)
      : Math.max(1, Number(customMinutes || 1));
    start(mins * 60);

    startPractice(setId);
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
        onTakeQuiz={onTakeQuiz}
        onRemoveSet={removeSet}
      />

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
        onRetake={() => startPractice(activeSetId)}
        secondsLeft={secondsLeft}
      />
    </div>
  );
}
