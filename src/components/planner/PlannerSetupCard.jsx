import DatePicker from "react-datepicker";
import {
  dateToHHmm,
  dateToIso,
  hhmmToDate,
  isoToDate,
} from "../../lib/dateHelpers";

export default function PlannerSetupCard({
  // course form
  name,
  setName,
  examDate,
  setExamDate,
  workload,
  setWorkload,
  onAddCourse,

  // availability + state
  availability,
  setAvailability,

  // errors
  errors = [],
}) {
  return (
    <div className="card">
      <h3 className="sectionTitle">Add a Course</h3>

      <form onSubmit={onAddCourse} className="formGrid">
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
            className="input"
            isClearable
            showPopperArrow={false}
          />
        </div>

        <div className="field">
          <label>Priority level (1–10)</label>
          <select
            value={workload}
            onChange={(e) => setWorkload(Number(e.target.value))}
          >
            {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
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
        Choose the days you can study and your preferred time window. This will
        be used to generate your schedule.
      </p>

      <div className="availability">
        <div className="days">
          {["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((d) => {
            const selected = (availability?.days || []).includes(d);

            return (
              <button
                key={d}
                type="button"
                className={selected ? "chip active" : "chip"}
                onClick={() => {
                  const currentDays = availability?.days || [];
                  const nextDays = selected
                    ? currentDays.filter((x) => x !== d)
                    : [...currentDays, d];

                  setAvailability({ ...(availability || {}), days: nextDays });
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
              selected={hhmmToDate(availability?.startTime || "18:00")}
              onChange={(d) =>
                setAvailability({
                  ...(availability || {}),
                  startTime: dateToHHmm(d),
                })
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
              selected={hhmmToDate(availability?.endTime || "20:00")}
              onChange={(d) =>
                setAvailability({
                  ...(availability || {}),
                  endTime: dateToHHmm(d),
                })
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
              value={availability?.sessionMinutes ?? 60}
              onChange={(e) =>
                setAvailability({
                  ...(availability || {}),
                  sessionMinutes: Number(e.target.value),
                })
              }
            />
          </div>
        </div>

        <p className="footerNote">
          Example: If you choose 18:00–20:00 with 60 mins sessions, you’ll have
          2 study slots per selected day.
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
  );
}
