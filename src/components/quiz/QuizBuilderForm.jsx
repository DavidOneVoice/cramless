import "./QuizBuilderForm.css";

export default function QuizBuilderForm({
  title,
  setTitle,
  sourceText,
  setSourceText,
  fileInfo,
  error,
  onFileUpload,
  onSave,

  courses = [],
  selectedCourseId = "",
  setSelectedCourseId = () => {},
}) {
  return (
    <section className="qbCard">
      <header className="qbHeader">
        <div className="qbHeaderTop">
          <div className="qbBadge">Quiz Builder</div>
          <div className="qbBadges">
            <span className="qbChip">PDF</span>
            <span className="qbChip">DOCX</span>
            <span className="qbChip">TXT</span>
          </div>
        </div>

        <h2 className="qbTitle">Turn your notes into practice questions.</h2>
        <p className="qbSub">
          Upload your course material and save it as a quiz set. When you click
          “Take Quiz”, CramLess generates high-quality MCQs from your material.
        </p>
      </header>

      <div className="qbBody">
        <div className="qbGrid">
          <div className="qbField">
            <label className="qbLabel">Set title</label>
            <input
              className="qbInput"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Chemistry — Equilibrium"
            />
          </div>

          {courses.length > 0 && (
            <div className="qbField">
              <label className="qbLabel">Link to Course (optional)</label>
              <select
                className="qbSelect"
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
              <p className="qbHelp">
                Linking helps you launch quizzes directly from the Study
                Planner.
              </p>
            </div>
          )}
        </div>

        <div className="qbField">
          <label className="qbLabel">Upload course material</label>

          <div className="qbUpload">
            <input
              className="qbFile"
              type="file"
              accept=".pdf,.docx,.txt"
              onChange={onFileUpload}
            />
            <div className="qbUploadHint">
              <div className="qbUploadTitle">PDF / DOCX / TXT</div>
              <div className="qbUploadSub">
                Tip: If your PDF is scanned, paste text instead (OCR later).
              </div>
            </div>
          </div>

          {fileInfo && (
            <div className="qbFileInfo">
              <span className="qbFileTag">Selected</span>
              <strong className="qbFileName">{fileInfo}</strong>
            </div>
          )}
        </div>

        <div className="qbField">
          <label className="qbLabel">Or paste course material</label>
          <textarea
            className="qbTextarea"
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            placeholder="Paste notes, slides text, textbook excerpt, etc..."
            rows={10}
          />
          <div className="qbCounter">
            {Math.min(sourceText?.length || 0, 999999).toLocaleString()} chars
          </div>
        </div>

        {error && <div className="qbError">{error}</div>}

        <div className="qbActions">
          <button className="qbPrimary" type="button" onClick={onSave}>
            Save Quiz Set
          </button>
        </div>
      </div>
    </section>
  );
}
