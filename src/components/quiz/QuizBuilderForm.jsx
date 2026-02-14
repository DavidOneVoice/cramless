export default function QuizBuilderForm({
  title,
  setTitle,
  sourceText,
  setSourceText,
  fileInfo,
  error,
  onFileUpload,
  onSave,
}) {
  return (
    <div className="card">
      <h2 className="sectionTitle">Quiz Builder</h2>
      <p className="muted">
        Upload your course material and save it as a quiz set. When you click
        “Take Quiz”, CramLess uses AI to generate high-quality MCQs from your
        material.
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

        <div className="field">
          <label>Upload course material (PDF / DOCX / TXT)</label>
          <input type="file" accept=".pdf,.docx,.txt" onChange={onFileUpload} />
          {fileInfo && (
            <p className="footerNote" style={{ marginTop: 8 }}>
              Selected: <strong>{fileInfo}</strong>
            </p>
          )}
          <p className="footerNote">
            Tip: If your PDF is scanned (image-only), we’ll need OCR to read it.
          </p>
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

        <p className="footerNote">
          Your data is saved locally in this browser (no login required).
        </p>
      </div>
    </div>
  );
}
