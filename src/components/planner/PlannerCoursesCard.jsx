import { useState } from "react";
import ConfirmModal from "../common/ConfirmModal";

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

      <ConfirmModal
        open={showClearConfirm}
        title="Clear schedule?"
        message="This will delete your generated timetable. Your courses and quizzes will remain."
        confirmText="Yes, clear"
        cancelText="Cancel"
        danger
        onCancel={() => setShowClearConfirm(false)}
        onConfirm={() => {
          onClearSchedule?.();
          setShowClearConfirm(false);
        }}
      />
    </div>
  );
}
