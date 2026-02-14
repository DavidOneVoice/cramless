import { useEffect, useMemo, useRef, useState } from "react";
import { generateSchedule } from "../lib/scheduler";
import { fromMinutes } from "../lib/time";
import { loadState, saveState } from "../lib/storage";
import { makeCourse, validateCourse } from "../lib/courses";

export default function Planner() {
  const [state, setState] = useState(() => loadState());

  const startTimeRef = useRef(null);
  const endTimeRef = useRef(null);
  const examDateRef = useRef(null);

  const [name, setName] = useState("");
  const [examDate, setExamDate] = useState("");
  const [workload, setWorkload] = useState(5);
  const [errors, setErrors] = useState([]);
  const [scheduleError, setScheduleError] = useState("");

  useEffect(() => {
    saveState(state);
  }, [state]);

  const courses = useMemo(() => state.courses || [], [state.courses]);
  const schedule = useMemo(() => state.schedule || [], [state.schedule]);

  function addCourse(e) {
    e.preventDefault();

    const candidate = { name, examDate, workload };
    const errs = validateCourse(candidate);
    if (errs.length) {
      setErrors(errs);
      return;
    }

    const newCourse = makeCourse(candidate);

    setState((prev) => ({
      ...prev,
      courses: [...(prev.courses || []), newCourse],
    }));

    setName("");
    setExamDate("");
    setWorkload(5);
    setErrors([]);
  }

  function removeCourse(id) {
    setState((prev) => ({
      ...prev,
      courses: (prev.courses || []).filter((c) => c.id !== id),
    }));
  }

  function handleGenerateSchedule() {
    const result = generateSchedule({
      courses: state.courses || [],
      availability: state.availability || {},
    });

    if (result.error) {
      setScheduleError(result.error);
      return;
    }

    setState((prev) => ({ ...prev, schedule: result.schedule }));
    setScheduleError("");
  }

  function handleClearSchedule() {
    setState((prev) => ({ ...prev, schedule: [] }));
    setScheduleError("");
  }

  return (
    <div>
      {/* CARD 1: Course Input + Availability */}
      <div className="card">
        <h2 className="sectionTitle">Study Planner</h2>
        <p className="muted">
          Add your courses and exam dates. Then set your availability to
          generate a balanced study schedule.
        </p>

        <form onSubmit={addCourse} className="formGrid">
          <div className="field">
            <label>Course name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., CSC 101 - Intro to Computing"
            />
          </div>

          <div className="field">
            <label>Exam date</label>

            <div className="dateWrap">
              <input
                ref={examDateRef}
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                onClick={() => examDateRef.current?.showPicker?.()}
                onFocus={() => examDateRef.current?.showPicker?.()}
              />

              <button
                type="button"
                className="dateBtn"
                onClick={() => examDateRef.current?.showPicker?.()}
                aria-label="Open calendar"
                title="Open calendar"
              >
                📅
              </button>
            </div>
          </div>

          <div className="field">
            <label>Priority level (1–10)</label>
            <input
              type="number"
              min="1"
              max="10"
              value={workload}
              onChange={(e) => setWorkload(e.target.value)}
            />
          </div>

          <div className="field">
            <label>&nbsp;</label>
            <button className="primaryBtn" type="submit">
              Add course
            </button>
          </div>
        </form>

        <hr className="divider" />

        <h3 className="sectionTitle">Study Availability</h3>
        <p className="muted">
          Choose the days you can study and your preferred time window. This
          will be used to generate your schedule.
        </p>

        <div className="availability">
          <div className="days">
            {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => {
              const selected = state.availability?.days?.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  className={selected ? "chip active" : "chip"}
                  onClick={() => {
                    setState((prev) => {
                      const currentDays = prev.availability?.days || [];
                      const nextDays = selected
                        ? currentDays.filter((x) => x !== d)
                        : [...currentDays, d];

                      return {
                        ...prev,
                        availability: {
                          ...(prev.availability || {}),
                          days: nextDays,
                        },
                      };
                    });
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>

          <div className="timeGrid">
            <div className="field">
              <label>Start time</label>

              <div className="dateWrap">
                <input
                  ref={startTimeRef}
                  type="time"
                  value={state.availability?.startTime || "18:00"}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      availability: {
                        ...(prev.availability || {}),
                        startTime: e.target.value,
                      },
                    }))
                  }
                  onClick={() => startTimeRef.current?.showPicker?.()}
                  onFocus={() => startTimeRef.current?.showPicker?.()}
                />

                <button
                  type="button"
                  className="dateBtn"
                  onClick={() => startTimeRef.current?.showPicker?.()}
                  aria-label="Open time picker"
                  title="Open time picker"
                >
                  🕒
                </button>
              </div>
            </div>

            <div className="field">
              <label>End time</label>

              <div className="dateWrap">
                <input
                  ref={endTimeRef}
                  type="time"
                  value={state.availability?.endTime || "20:00"}
                  onChange={(e) =>
                    setState((prev) => ({
                      ...prev,
                      availability: {
                        ...(prev.availability || {}),
                        endTime: e.target.value,
                      },
                    }))
                  }
                  onClick={() => endTimeRef.current?.showPicker?.()}
                  onFocus={() => endTimeRef.current?.showPicker?.()}
                />

                <button
                  type="button"
                  className="dateBtn"
                  onClick={() => endTimeRef.current?.showPicker?.()}
                  aria-label="Open time picker"
                  title="Open time picker"
                >
                  🕒
                </button>
              </div>
            </div>

            <div className="field">
              <label>Session length (mins)</label>
              <input
                type="number"
                min="15"
                max="240"
                value={state.availability?.sessionMinutes ?? 60}
                onChange={(e) =>
                  setState((prev) => ({
                    ...prev,
                    availability: {
                      ...(prev.availability || {}),
                      sessionMinutes: Number(e.target.value),
                    },
                  }))
                }
              />
            </div>
          </div>

          <p className="footerNote">
            Example: If you choose 18:00–20:00 with 60 mins sessions, you’ll
            have 2 study slots per selected day.
          </p>
        </div>

        {errors.length > 0 && (
          <div className="errorBox">
            <strong>Please fix:</strong>
            <ul>
              {errors.map((er) => (
                <li key={er}>{er}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* CARD 2: Courses Table + Schedule */}
      <div className="card" style={{ marginTop: 14 }}>
        <h3 className="sectionTitle">Your Courses</h3>

        {courses.length === 0 ? (
          <p className="muted">No courses added yet.</p>
        ) : (
          <div className="table">
            <div className="row head">
              <div>Course</div>
              <div>Exam Date</div>
              <div>Priority</div>
              <div></div>
            </div>

            {courses.map((c) => (
              <div className="row" key={c.id}>
                <div>{c.name}</div>
                <div>{c.examDate}</div>
                <div>{c.workload}</div>
                <div className="right">
                  <button
                    className="dangerBtn"
                    type="button"
                    onClick={() => removeCourse(c.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {scheduleError && (
          <div className="errorBox" style={{ marginTop: 12 }}>
            {scheduleError}
          </div>
        )}

        <div
          style={{ marginTop: 12, display: "flex", gap: 10, flexWrap: "wrap" }}
        >
          <button
            className="primaryBtn"
            type="button"
            onClick={handleGenerateSchedule}
          >
            Generate Schedule
          </button>

          <button
            className="navBtn"
            type="button"
            onClick={handleClearSchedule}
          >
            Clear Schedule
          </button>
          <button
            className="navBtn"
            type="button"
            onClick={() => {
              const schedule = state.schedule || [];
              if (!schedule.length) return;

              const lines = schedule.map((s) => {
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
            }}
          >
            Export (Copy)
          </button>
        </div>

        {schedule.length > 0 && (
          <div style={{ marginTop: 14 }}>
            <h3 className="sectionTitle">Generated Schedule</h3>

            <div className="table">
              <div className="row head schedule">
                <div>Date</div>
                <div>Time</div>
                <div>Course</div>
                <div>Type</div>
              </div>

              {schedule.map((s, idx) => (
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

            <p className="footerNote">
              The schedule prioritizes higher-priority courses and exams that
              are closer.
            </p>
          </div>
        )}

        <p className="footerNote">
          Tip: Priority helps the scheduler allocate more time to heavier or
          more important courses.
        </p>
      </div>
    </div>
  );
}
