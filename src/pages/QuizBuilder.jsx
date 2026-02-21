import { useEffect, useMemo, useState } from "react";
import { loadState, saveState } from "../lib/storage";
import { extractTextFromPdf } from "../lib/pdfText";
import mammoth from "mammoth";
import QuizBuilderForm from "../components/quiz/QuizBuilderForm";

export default function QuizBuilder() {
  const [state, setState] = useState(() => loadState());

  const courses = useMemo(() => state.courses || [], [state.courses]);

  // Builder form state
  const [title, setTitle] = useState("");
  const [sourceText, setSourceText] = useState("");
  const [fileInfo, setFileInfo] = useState("");
  const [error, setError] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");

  useEffect(() => {
    saveState(state);
  }, [state]);

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

    // ✅ Redirect user to Quiz Sets list
    window.location.hash = "#/quizSets";
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
