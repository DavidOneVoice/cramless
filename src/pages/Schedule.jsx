import { useMemo, useState } from "react";
import { loadState } from "../lib/storage";
import { fromMinutes } from "../lib/time";

export default function Schedule() {
  const [state] = useState(() => loadState());

  const schedule = useMemo(() => state.schedule || [], [state.schedule]);
  const courses = useMemo(() => state.courses || [], [state.courses]);

  const [filterCourseId, setFilterCourseId] = useState("");

  const filtered = useMemo(() => {
    if (!filterCourseId) return schedule;
    return schedule.filter((s) => s.courseId === filterCourseId);
  }, [schedule, filterCourseId]);

  function exportCopy(sc) {
    if (!sc.length) return;

    const lines = sc.map((s) => {
      const time = `${fromMinutes(s.startMinutes)}–${fromMinutes(s.endMinutes)}`;
      return `${s.date} | ${time} | ${s.courseName} | ${s.type}`;
    });

    const text = [
      "CramLess — Generated Study Schedule",
      "----------------------------------",
      ...lines,
    ].join("\n");

    navigator.clipboard.writeText(text);
    alert("Schedule copied to clipboard ✅");
  }

  return (
    <div className="card">
      <h2 className="sectionTitle">Your Study Schedule</h2>

      {schedule.length === 0 ? (
        <>
          <p className="muted">
            No schedule generated yet. Go to Planner and click “Generate
            Schedule”.
          </p>

          <button
            className="primaryBtn"
            type="button"
            onClick={() => (window.location.hash = "#/planner")}
          >
            Go to Planner
          </button>
        </>
      ) : (
        <>
          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 10,
            }}
          >
            <div className="field" style={{ minWidth: 260 }}>
              <label>Filter by course (optional)</label>
              <select
                value={filterCourseId}
                onChange={(e) => setFilterCourseId(e.target.value)}
              >
                <option value="">All courses</option>
                {courses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="field" style={{ alignSelf: "end" }}>
              <label>&nbsp;</label>
              <button
                className="navBtn"
                type="button"
                onClick={() => exportCopy(filtered)}
              >
                Export (Copy)
              </button>
            </div>

            <div className="field" style={{ alignSelf: "end" }}>
              <label>&nbsp;</label>
              <button
                className="navBtn"
                type="button"
                onClick={() => (window.location.hash = "#/planner")}
              >
                Back to Planner
              </button>
            </div>
          </div>

          <div style={{ marginTop: 14 }}>
            <div className="table">
              <div className="row head schedule">
                <div>Date</div>
                <div>Time</div>
                <div>Course</div>
                <div>Type</div>
              </div>

              {filtered.map((s, idx) => (
                <div className="row schedule" key={idx}>
                  <div>{s.date}</div>
                  <div>
                    {fromMinutes(s.startMinutes)}–{fromMinutes(s.endMinutes)}
                  </div>
                  <div>{s.courseName}</div>
                  <div>{s.type}</div>
                </div>
              ))}
            </div>

            <p className="footerNote" style={{ marginTop: 10 }}>
              Showing {filtered.length} session(s).
            </p>
          </div>
        </>
      )}
    </div>
  );
}
