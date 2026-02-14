import { getQuizMinutes } from "../../utils/quizTime";

export default function QuizControls({
  questionCount,
  setQuestionCount,
  useAutoTime,
  setUseAutoTime,
  customMinutes,
  setCustomMinutes,
}) {
  return (
    <div
      style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}
    >
      <div className="field" style={{ minWidth: 180 }}>
        <label>Questions</label>
        <select
          value={questionCount}
          onChange={(e) => setQuestionCount(Number(e.target.value))}
        >
          {[5, 10, 15, 20, 30].map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </select>
      </div>

      <div className="field" style={{ minWidth: 240 }}>
        <label>Timer</label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <label style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="checkbox"
              checked={useAutoTime}
              onChange={(e) => setUseAutoTime(e.target.checked)}
            />
            Auto ({getQuizMinutes(questionCount)} mins)
          </label>

          {!useAutoTime && (
            <input
              type="number"
              min="1"
              value={customMinutes}
              onChange={(e) => setCustomMinutes(e.target.value)}
              style={{ width: 90 }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
