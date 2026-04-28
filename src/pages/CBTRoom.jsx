import { useEffect, useMemo, useRef, useState } from "react";
import { loadState, saveState } from "../lib/storage";
import { useCountdown } from "../hooks/useCountdown";
import PracticeMode from "../components/quiz/PracticeMode";
import { API_BASE } from "../lib/api";
import "./CBTRoom.css";

// -------------------- helpers --------------------

/**
 * Reads a query parameter from the hash portion of the URL.
 * Expected format: #/route?key=value&key2=value2
 */
function getQueryParam(name) {
  const hash = window.location.hash || "";
  const q = hash.split("?")[1] || "";
  const params = new URLSearchParams(q);
  return params.get(name) || "";
}

/**
 * Reads a query parameter as a positive integer.
 * Falls back to the provided default when missing/invalid.
 */
function getIntParam(name, fallback) {
  const v = Number(getQueryParam(name));
  return Number.isFinite(v) && v > 0 ? Math.floor(v) : fallback;
}

/**
 * Normalizes backend question payloads into the frontend shape:
 * { id, prompt, options[4], answer, explanation }.
 *
 * Supports both:
 * - answer: "option text"
 * - answerIndex: number (0..3)
 */
function normalizeGeneratedQuestions(rawQuestions) {
  if (!Array.isArray(rawQuestions)) return [];

  return rawQuestions
    .map((q) => {
      if (!q || typeof q.prompt !== "string") return null;

      const options = Array.isArray(q.options)
        ? q.options.map((opt) => String(opt ?? "").trim())
        : [];
      if (options.length !== 4 || options.some((opt) => !opt)) return null;

      let answer = "";
      if (typeof q.answer === "string" && q.answer.trim()) {
        answer = q.answer.trim();
      } else if (Number.isInteger(q.answerIndex) && q.answerIndex >= 0 && q.answerIndex <= 3) {
        answer = options[q.answerIndex];
      }

      if (!answer) return null;
      if (!options.includes(answer)) return null;

      return {
        id: q.id || crypto.randomUUID(),
        prompt: q.prompt.trim(),
        options,
        answer,
        explanation:
          typeof q.explanation === "string" ? q.explanation.trim() : "",
      };
    })
    .filter(Boolean);
}

// ------------------------------------------------

/**
 * CBTRoom is the quiz-taking screen:
 * - Loads quiz sets from local storage state
 * - Generates fresh questions from the backend (AI) for a selected set
 * - Runs a countdown timer and auto-finishes at 0
 * - Saves the most recent attempts back to the selected quiz set
 */
export default function CBTRoom() {
  const [state, setState] = useState(() => loadState());
  const quizSets = useMemo(() => state.quizSets || [], [state.quizSets]);

  const [error, setError] = useState("");
  const [generating, setGenerating] = useState(false);

  // Practice state (live quiz session)
  const [activeSetId, setActiveSetId] = useState(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [attemptAnswers, setAttemptAnswers] = useState({});
  const [score, setScore] = useState(0);
  const [showResult, setShowResult] = useState(false);

  const { secondsLeft, isRunning, start, stop, reset } = useCountdown();

  /**
   * Persist app state whenever it changes.
   * This keeps quiz sets, attempts, and planner data in localStorage.
   */
  useEffect(() => {
    saveState(state);
  }, [state]);

  /**
   * Resolve the currently active quiz set from state.
   */
  const activeSet = useMemo(
    () => quizSets.find((s) => s.id === activeSetId) || null,
    [quizSets, activeSetId],
  );

  /**
   * Auto-finish the quiz if timer reaches 0.
   * `useCountdown` stops running at 0, so we check for isRunning false + secondsLeft 0.
   */
  useEffect(() => {
    if (activeSetId && isRunning === false && secondsLeft === 0) {
      if (!showResult) setShowResult(true);
    }
  }, [activeSetId, isRunning, secondsLeft, showResult]);

  /**
   * Initializes a fresh quiz attempt UI state for a given set.
   * (Timer is started separately.)
   */
  function startPractice(setId) {
    setActiveSetId(setId);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setAttemptAnswers({});
    setScore(0);
    setShowResult(false);
  }

  /**
   * Exits CBT mode and returns to the relevant page.
   * Also stops and resets the countdown timer.
   */
  function exitPractice() {
    setActiveSetId(null);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setAttemptAnswers({});
    setScore(0);
    setShowResult(false);
    stop();
    reset();

    const sid = getQueryParam("setId");
    window.location.hash = sid ? `#/quizSet?setId=${sid}` : "#/quizSets";
  }

  /**
   * Advances to the next question (or finishes the quiz at the end).
   * Uses:
   * - answerOverride (passed from child) OR
   * - currently selectedAnswer OR
   * - the stored answer for the current question
   */
  function handleNext(answerOverride) {
    if (!activeSet) return;

    const q = activeSet.questions[currentIndex];

    const chosen =
      answerOverride ?? selectedAnswer ?? attemptAnswers?.[q?.id] ?? null;

    // Do not advance unless an answer exists.
    if (!chosen) return;

    // Update score immediately for correct answers.
    if (chosen === q.answer) setScore((p) => p + 1);

    // If this was the last question, finish immediately.
    if (currentIndex + 1 >= activeSet.questions.length) {
      setShowResult(true);
      stop();
      return;
    }

    setCurrentIndex((p) => p + 1);
    setSelectedAnswer(null);
  }

  /**
   * Saves a quiz attempt into the selected set.
   * Keeps only the most recent 4 attempts.
   */
  function saveAttemptForSet({
    setId,
    score,
    total,
    answers,
    questionsSnapshot,
    minutesPlanned,
  }) {
    const takenAt = new Date().toISOString();

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

  /**
   * Calls the backend AI endpoint to generate MCQs for a quiz set.
   * Also tracks prompt history to reduce repeated questions across attempts.
   */
  async function generateWithAI(setId, count = 10) {
    const target = (state.quizSets || []).find((x) => x.id === setId);
    if (!target) return [];

    try {
      setGenerating(true);
      setError(
        "Generating quiz questions… This may take 30-60 seconds or more.",
      );

      const r = await fetch(`${API_BASE}/api/generate-mcqs`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: target.title,
          sourceText: target.sourceText,
          count,
          difficulty: "mixed",
          // Nonce helps encourage variation across repeated requests.
          nonce: crypto.randomUUID(),
          // Avoid prompts that were previously used (best-effort diversity).
          avoid: (target.promptHistory || target.questions || [])
            .map((q) => (typeof q === "string" ? q : q.prompt))
            .filter(Boolean)
            .slice(0, 60),
        }),
      });

      // Read raw text first so we can handle non-JSON responses gracefully.
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

      const questions = normalizeGeneratedQuestions(data.questions);
      if (!questions.length) {
        setError(
          "AI returned no valid questions in a usable format. Please try again.",
        );
        return [];
      }

      // Allow partial results so users can still practice even when the AI undershoots.
      const isPartial = questions.length < count;
      if (isPartial) {
        setError(
          `Requested ${count} questions, but received ${questions.length}. Starting quiz with available questions.`,
        );
      }

      // Store generated questions + prompt history back into the set.
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

      if (!isPartial) setError("");
      return questions;
    } catch (err) {
      console.error(err);
      setError(err?.message || "AI generation failed.");
      return [];
    } finally {
      setGenerating(false);
    }
  }

  // Prevent double-start for the same (setId|count|mins) combination.
  const startedRef = useRef("");

  useEffect(() => {
    const setId = getQueryParam("setId");
    if (!setId) {
      setError("No quiz set selected.");
      return;
    }

    const count = getIntParam("count", 10);
    const mins = getIntParam("mins", count);

    const key = `${setId}:${count}:${mins}`;
    if (startedRef.current === key) return;
    startedRef.current = key;

    (async () => {
      // Clear any previous in-progress attempt so stale questions are never shown
      // if this generation fails.
      setActiveSetId(null);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setAttemptAnswers({});
      setScore(0);
      setShowResult(false);

      const questions = await generateWithAI(setId, count);
      if (!questions.length) return;
      const actualCount = questions.length;

      // Start timer (in seconds) and initialize UI state for a new attempt.
      start(mins * 60);
      startPractice(setId);

      // Normalize URL to reflect the active quiz settings.
      window.location.hash = `#/cbt?setId=${setId}&count=${actualCount}&mins=${mins}`;
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.quizSets]);

  /**
   * Retake generates a fresh set of questions again (best-effort diversity),
   * then restarts timer and resets attempt state.
   */
  async function onRetake() {
    if (!activeSetId) return;

    const count = getIntParam("count", 10);
    const mins = getIntParam("mins", count);

    // Clear old attempt UI first to avoid showing stale counts/questions while regenerating.
    setActiveSetId(null);
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setAttemptAnswers({});
    setScore(0);
    setShowResult(false);

    const questions = await generateWithAI(activeSetId, count);
    if (!questions.length) return;
    const actualCount = questions.length;

    start(mins * 60);
    startPractice(activeSetId);
    window.location.hash = `#/cbt?setId=${activeSetId}&count=${actualCount}&mins=${mins}`;
  }

  /**
   * Generates a real PDF file client-side and downloads it directly.
   */
  function exportQuestionsAsPdf() {
    if (!activeSet?.questions?.length) {
      setError("No generated questions available to export yet.");
      return;
    }

    try {
      const now = new Date();
      const generatedAt = now.toLocaleString();
      const slug = activeSet.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
      const fileName = `${slug || "quiz"}-questions-${now.toISOString().slice(0, 10)}.pdf`;
      const sanitize = (value) =>
        String(value ?? "")
          .replaceAll(/\s+/g, " ")
          .trim();
      const escapePdf = (value) =>
        sanitize(value)
          .replaceAll("\\", "\\\\")
          .replaceAll("(", "\\(")
          .replaceAll(")", "\\)")
          .replaceAll(/[^\x20-\x7E]/g, "?");
      const wrapText = (text, maxChars) => {
        const words = sanitize(text).split(" ");
        const lines = [];
        let current = "";
        for (const word of words) {
          const test = current ? `${current} ${word}` : word;
          if (test.length <= maxChars) {
            current = test;
          } else if (current) {
            lines.push(current);
            current = word;
          } else {
            lines.push(word.slice(0, maxChars));
            current = word.slice(maxChars);
          }
        }
        if (current) lines.push(current);
        return lines.length ? lines : [""];
      };

      const lines = [];
      lines.push(...wrapText(`${activeSet.title} - Quiz Questions`, 90));
      lines.push(`${activeSet.questions.length} questions | Generated ${generatedAt}`);
      lines.push("");

      for (const [idx, q] of activeSet.questions.entries()) {
        lines.push(...wrapText(`Question ${idx + 1}`, 90));
        lines.push(...wrapText(q.prompt || "", 90));
        for (const [optIdx, opt] of (q.options || []).entries()) {
          const label = `${String.fromCharCode(65 + optIdx)}. ${opt || ""}`;
          lines.push(...wrapText(label, 88));
        }
        lines.push("");
      }

      const linesPerPage = 48;
      const pageChunks = [];
      for (let i = 0; i < lines.length; i += linesPerPage) {
        pageChunks.push(lines.slice(i, i + linesPerPage));
      }

      const objects = [];
      objects.push("<< /Type /Catalog /Pages 2 0 R >>"); // 1
      objects.push("<< /Type /Pages /Kids [] /Count 0 >>"); // 2 placeholder
      objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"); // 3

      const pageObjectIds = [];
      for (const chunk of pageChunks) {
        const contentLines = chunk.map((line) => `(${escapePdf(line)}) Tj T*`).join("\n");
        const stream = `BT
/F1 11 Tf
50 792 Td
14 TL
${contentLines}
ET`;
        const contentObjId = objects.length + 1;
        objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);

        const pageObjId = objects.length + 1;
        pageObjectIds.push(pageObjId);
        objects.push(
          `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R >> >> /Contents ${contentObjId} 0 R >>`,
        );
      }

      objects[1] = `<< /Type /Pages /Kids [${pageObjectIds
        .map((id) => `${id} 0 R`)
        .join(" ")}] /Count ${pageObjectIds.length} >>`;

      let pdfText = "%PDF-1.4\n";
      const offsets = [0];
      for (let i = 0; i < objects.length; i += 1) {
        offsets.push(pdfText.length);
        pdfText += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
      }

      const xrefOffset = pdfText.length;
      pdfText += `xref
0 ${objects.length + 1}
0000000000 65535 f 
`;
      for (let i = 1; i < offsets.length; i += 1) {
        pdfText += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
      }
      pdfText += `trailer
<< /Size ${objects.length + 1} /Root 1 0 R >>
startxref
${xrefOffset}
%%EOF`;

      const pdfBytes = new TextEncoder().encode(pdfText);
      const blob = new Blob([pdfBytes], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to export PDF", err);
      setError("Could not export PDF automatically. Please try again.");
    }
  }

  // Read the configured count/mins for displaying in the HUD.
  const count = activeSet?.questions?.length || getIntParam("count", 10);
  const mins = getIntParam("mins", count);

  /**
   * Loading / error fallback UI when no active set is available yet
   * (e.g., while generating questions).
   */
  if (!activeSetId || !activeSet) {
    return (
      <section className="cbtShell card">
        <div className="cbtHeaderOnly">
          <h2 className="cbtTitle">CBT Room</h2>
          <p className="cbtMuted">
            {error || (generating ? "Preparing your quiz…" : "Loading…")}
          </p>
        </div>

        <button
          className="cbtBack"
          type="button"
          onClick={() => (window.location.hash = "#/quizSets")}
        >
          Back to Quiz Sets
        </button>
      </section>
    );
  }

  return (
    <div className="cbtPage">
      <section className="cbtHud">
        <div className="cbtHudLeft">
          <div className="cbtBadge">CBT Room</div>
          <div className="cbtSetTitle">{activeSet.title}</div>
          <div className="cbtMeta">
            <span className="cbtMetaItem">{count} questions</span>
            <span className="cbtMetaDot" aria-hidden="true" />
            <span className="cbtMetaItem">{mins} mins</span>
          </div>
        </div>

        <div className="cbtHudRight">
          <button
            className="cbtExportBtn"
            type="button"
            onClick={exportQuestionsAsPdf}
          >
            Export as PDF
          </button>

          {/* Surface any generation/runtime error messages */}
          {error && <div className="cbtError">{error}</div>}
        </div>
      </section>

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
          // Save attempt only when we have a valid set and questions snapshot.
          if (!activeSetId || !activeSet) return;

          saveAttemptForSet({
            setId: activeSetId,
            score,
            total: (activeSet.questions || []).length,
            answers: attemptAnswers,
            questionsSnapshot: activeSet.questions || [],
            minutesPlanned: mins,
          });
        }}
      />
    </div>
  );
}
