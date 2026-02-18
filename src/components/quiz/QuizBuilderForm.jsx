export default function QuizBuilderForm({
  title,
  setTitle,
  sourceText,
  setSourceText,
  fileInfo,
  error,
  onFileUpload,
  onSave,

  // NEW (for linking)
  courses = [],
  selectedCourseId = "",
  setSelectedCourseId = () => {},
}) {
  return (
    <div className="card">
      <h2 className="sectionTitle">Quiz Builder</h2>
      <p className="muted">
        Upload your course material and save it as a quiz set. When you click
        “Take Quiz”, CramLess generates high-quality MCQs from your material.
      </p>

      <div className="formStack">
        <div className="field">
          <label>Set title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Chemistry — Equilibrium"
          />
        </div>

        {courses.length > 0 && (
          <div className="field">
            <label>Link to Course (optional)</label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
            >
              <option value="">— Not linked —</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="footerNote" style={{ marginTop: 6 }}>
              Linking helps you launch quizzes directly from the Study Planner.
            </p>
          </div>
        )}

        <div className="field">
          <label>Upload course material (PDF / DOCX / TXT)</label>
          <input type="file" accept=".pdf,.docx,.txt" onChange={onFileUpload} />
          {fileInfo && (
            <p className="footerNote" style={{ marginTop: 8 }}>
              Selected: <strong>{fileInfo}</strong>
            </p>
          )}
        </div>

        <div className="field">
          <label>Or paste course material (fallback)</label>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="Paste notes, slides text, textbook excerpt, etc..."
            rows={8}
          />
        </div>

        {error && <div className="errorBox">{error}</div>}

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className="primaryBtn" type="button" onClick={onSave}>
            Save Quiz Set
          </button>
        </div>
      </div>
    </div>
  );
}
