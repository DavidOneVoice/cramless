import { useEffect, useMemo, useState } from "react";
import { loadState } from "../lib/storage";
import { fromMinutes } from "../lib/time";

export default function Schedule() {
  const [state, setState] = useState(() => loadState());
  const [filterCourseId, setFilterCourseId] = useState("");

  // ✅ Refresh state whenever hash route changes (planner -> schedule, etc.)
  useEffect(() => {
    function onHashChange() {
      setState(loadState());
    }

    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const schedule = useMemo(() => state.schedule || [], [state.schedule]);
  const courses = useMemo(() => state.courses || [], [state.courses]);

  // ✅ Safety net: if a course was deleted, hide its leftover schedule items
  const validCourseIds = useMemo(
    () => new Set(courses.map((c) => c.id)),
    [courses],
  );

  const cleanedSchedule = useMemo(() => {
    // keep sessions only if course still exists
    return schedule.filter((s) => validCourseIds.has(s.courseId));
  }, [schedule, validCourseIds]);

  const filtered = useMemo(() => {
    if (!filterCourseId) return cleanedSchedule;
    return cleanedSchedule.filter((s) => s.courseId === filterCourseId);
  }, [cleanedSchedule, filterCourseId]);

  // ✅ If the selected filter course no longer exists, reset the filter
  useEffect(() => {
    if (!filterCourseId) return;
    if (!validCourseIds.has(filterCourseId)) setFilterCourseId("");
  }, [filterCourseId, validCourseIds]);

  function downloadFile(filename, content, mime = "text/plain") {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();

    URL.revokeObjectURL(url);
  }

  function toScheduleTxt(sc) {
    const lines = sc.map((s) => {
      const time = `${fromMinutes(s.startMinutes)}–${fromMinutes(s.endMinutes)}`;
      return `${s.date} | ${time} | ${s.courseName} | ${s.type}`;
    });

    return [
      "CramLess — Generated Study Schedule",
      "----------------------------------",
      ...lines,
    ].join("\n");
  }

  function escapeCsv(v) {
    const s = String(v ?? "");
    if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
    return s;
  }

  function toScheduleCsv(sc) {
    const header = ["Date", "Start", "End", "Course", "Type"];

    const rows = sc.map((s) => [
      s.date,
      fromMinutes(s.startMinutes),
      fromMinutes(s.endMinutes),
      s.courseName || "",
      s.type || "",
    ]);

    return [header, ...rows]
      .map((row) => row.map(escapeCsv).join(","))
      .join("\n");
  }

  const hasSchedule = cleanedSchedule.length > 0;

  return (
    <div className="card">
      <h2 className="sectionTitle">Your Study Schedule</h2>

      {!hasSchedule ? (
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

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  className="navBtn"
                  type="button"
                  onClick={() => {
                    if (!filtered.length) return;
                    const txt = toScheduleTxt(filtered);
                    navigator.clipboard.writeText(txt);
                    alert("Schedule copied to clipboard ✅");
                  }}
                >
                  Copy
                </button>

                <button
                  className="navBtn"
                  type="button"
                  onClick={() => {
                    if (!filtered.length) return;
                    const txt = toScheduleTxt(filtered);
                    downloadFile("cramless-schedule.txt", txt, "text/plain");
                  }}
                >
                  Export TXT
                </button>

                <button
                  className="navBtn"
                  type="button"
                  onClick={() => {
                    if (!filtered.length) return;
                    const csv = toScheduleCsv(filtered);
                    downloadFile("cramless-schedule.csv", csv, "text/csv");
                  }}
                >
                  Export CSV
                </button>
              </div>
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
