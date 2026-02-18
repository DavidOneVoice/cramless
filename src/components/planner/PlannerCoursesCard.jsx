import { useState } from "react";

export default function PlannerCoursesCard({
  courses = [],
  quizSets = [],
  takingQuizSetId,
  onRemoveCourse,
  onTakeQuizFromPlanner,

  quizError,
  scheduleError,

  onGenerateSchedule,
  onClearSchedule,
}) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  return (
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
                      onClick={() => onRemoveCourse(c.id)}
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

                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                      {courseQuizzes.map((q) => (
                        <button
                          key={q.id}
                          className="navBtn"
                          type="button"
                          disabled={takingQuizSetId === q.id}
                          onClick={() => onTakeQuizFromPlanner(q.id, 10)}
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
          onClick={onGenerateSchedule}
        >
          Generate Schedule
        </button>

        <button
          className="navBtn"
          type="button"
          onClick={() => setShowClearConfirm(true)}
        >
          Clear Schedule
        </button>
      </div>

      <p className="footerNote">
        Tip: Priority helps the scheduler allocate more time to heavier or more
        important courses.
      </p>

      {/* ✅ Fancy Confirm Modal */}
      {showClearConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setShowClearConfirm(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            zIndex: 9999,
          }}
        >
          <div
            className="card"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "min(520px, 100%)",
              padding: 16,
            }}
          >
            <div style={{ fontWeight: 900, fontSize: 18 }}>Clear schedule?</div>

            <p className="muted" style={{ marginTop: 8, lineHeight: 1.5 }}>
              This will delete your generated timetable. Your courses and
              quizzes will remain.
            </p>

            <div
              style={{
                display: "flex",
                gap: 10,
                justifyContent: "flex-end",
                flexWrap: "wrap",
                marginTop: 14,
              }}
            >
              <button
                type="button"
                className="navBtn"
                onClick={() => setShowClearConfirm(false)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="dangerBtn"
                onClick={() => {
                  onClearSchedule?.();
                  setShowClearConfirm(false);
                }}
              >
                Yes, Clear
              </button>
            </div>

            <p className="footerNote" style={{ marginTop: 10 }}>
              Tip: Click outside this box to close.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
