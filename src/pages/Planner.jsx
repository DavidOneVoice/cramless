import { useEffect, useMemo, useState } from "react";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import { generateSchedule } from "../lib/scheduler";
import { fromMinutes } from "../lib/time";
import { loadState, saveState } from "../lib/storage";
import { makeCourse, validateCourse } from "../lib/courses";

function isoToDate(iso) {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function dateToIso(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "";
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function hhmmToDate(hhmm) {
  const base = new Date();
  const [h, m] = String(hhmm || "00:00")
    .split(":")
    .map(Number);
  base.setHours(Number.isFinite(h) ? h : 0, Number.isFinite(m) ? m : 0, 0, 0);
  return base;
}

function dateToHHmm(d) {
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return "00:00";
  const hh = String(d.getHours()).padStart(2, "0");
  const mm = String(d.getMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export default function Planner() {
  const [state, setState] = useState(() => loadState());

  const [name, setName] = useState("");
  const [examDate, setExamDate] = useState(""); // YYYY-MM-DD
  const [workload, setWorkload] = useState(5);
  const [errors, setErrors] = useState([]);
  const [scheduleError, setScheduleError] = useState("");

  // Quiz integration UI state
  const [takingQuizSetId, setTakingQuizSetId] = useState(null);
  const [quizError, setQuizError] = useState("");

  useEffect(() => {
    saveState(state);
  }, [state]);

  const courses = useMemo(() => state.courses || [], [state.courses]);
  const schedule = useMemo(() => state.schedule || [], [state.schedule]);
  const quizSets = useMemo(() => state.quizSets || [], [state.quizSets]);

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
    window.location.hash = "#/schedule";
  }

  function handleClearSchedule() {
    setState((prev) => ({ ...prev, schedule: [] }));
    setScheduleError("");
  }

  async function takeQuizFromPlanner(quizSetId, count = 10) {
    const target = (state.quizSets || []).find((q) => q.id === quizSetId);
    if (!target) return;

    try {
      setTakingQuizSetId(quizSetId);
      setQuizError("");

      const r = await fetch("http://localhost:5050/api/generate-mcqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: target.title,
          sourceText: target.sourceText,
          count,
          difficulty: "mixed",
          nonce: crypto.randomUUID(),
          avoid: (target.promptHistory || target.questions || [])
            .map((q) => (typeof q === "string" ? q : q.prompt))
            .filter(Boolean)
            .slice(0, 40),
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
        setQuizError(data.error || `AI generation failed (HTTP ${r.status}).`);
        return;
      }

      const questions = Array.isArray(data.questions) ? data.questions : [];
      if (!questions.length) {
        setQuizError("AI returned no questions. Try uploading more material.");
        return;
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
        setQuizError(
          "AI returned questions in an unexpected format. Try again.",
        );
        return;
      }

      setState((prev) => ({
        ...prev,
        quizSets: (prev.quizSets || []).map((set) =>
          set.id === quizSetId ? { ...set, questions } : set,
        ),
        ui: { ...(prev.ui || {}), activeTab: "quiz", activeSetId: quizSetId },
      }));

      alert("Quiz generated ✅ Open Quiz Builder to take it.");
    } catch (err) {
      console.error(err);
      setQuizError(err?.message || "Failed to generate quiz.");
    } finally {
      setTakingQuizSetId(null);
    }
  }

  return (
    <div>
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
            <DatePicker
              selected={isoToDate(examDate)}
              onChange={(d) => setExamDate(dateToIso(d))}
              placeholderText="Select exam date"
              dateFormat="yyyy-MM-dd"
              className="input" // optional: match your inputs (or remove)
              isClearable
              showPopperArrow={false}
            />
          </div>

          <div className="field">
            <label>Priority level (1–10)</label>
            <input
              type="number"
              min="1"
              max="10"
              value={workload}
              onChange={(e) => setWorkload(Number(e.target.value))}
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
              <DatePicker
                selected={hhmmToDate(state.availability?.startTime || "18:00")}
                onChange={(d) =>
                  setState((prev) => ({
                    ...prev,
                    availability: {
                      ...(prev.availability || {}),
                      startTime: dateToHHmm(d),
                    },
                  }))
                }
                showTimeSelect
                showTimeSelectOnly
                timeIntervals={5}
                timeCaption="Time"
                dateFormat="HH:mm"
                className="input"
                showPopperArrow={false}
              />
            </div>

            <div className="field">
              <label>End time</label>
              <DatePicker
                selected={hhmmToDate(state.availability?.endTime || "20:00")}
                onChange={(d) =>
                  setState((prev) => ({
                    ...prev,
                    availability: {
                      ...(prev.availability || {}),
                      endTime: dateToHHmm(d),
                    },
                  }))
                }
                showTimeSelect
                showTimeSelectOnly
                timeIntervals={5}
                timeCaption="Time"
                dateFormat="HH:mm"
                className="input"
                showPopperArrow={false}
              />
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
              <div>Actions</div>
            </div>

            {courses.map((c) => {
              const courseQuizzes = quizSets.filter((q) => q.courseId === c.id);

              return (
                <div key={c.id} style={{ paddingBottom: 10 }}>
                  <div className="row">
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

                  {courseQuizzes.length > 0 && (
                    <div style={{ marginTop: 10, paddingLeft: 6 }}>
                      <div style={{ fontWeight: 600, opacity: 0.9 }}>
                        Linked Quizzes
                      </div>

                      <div
                        style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
                      >
                        {courseQuizzes.map((q) => (
                          <button
                            key={q.id}
                            className="navBtn"
                            type="button"
                            disabled={takingQuizSetId === q.id}
                            onClick={() => takeQuizFromPlanner(q.id, 10)}
                            style={{ marginTop: 6 }}
                          >
                            {takingQuizSetId === q.id
                              ? "Generating…"
                              : `Take Quiz: ${q.title}`}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {quizError && (
          <div className="errorBox" style={{ marginTop: 12 }}>
            {quizError}
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
        </div>

        <p className="footerNote">
          Tip: Priority helps the scheduler allocate more time to heavier or
          more important courses.
        </p>
      </div>
    </div>
  );
}
