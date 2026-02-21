import { useState } from "react";
import ConfirmModal from "../common/ConfirmModal";
import "./PlannerCoursesCard.css";

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
    <div className="pccCard card">
      <header className="pccHeader">
        <div>
          <div className="pccBadge">Step 3</div>
          <h3 className="pccTitle">Your Courses</h3>
          <p className="pccSub">
            Manage courses, launch linked quizzes, then generate your schedule.
          </p>
        </div>

        <div className="pccHeaderActions">
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
      </header>

      {courses.length === 0 ? (
        <div className="pccEmpty">
          <div className="pccEmptyIcon" aria-hidden="true" />
          <div>
            <div className="pccEmptyTitle">No courses added yet</div>
            <div className="pccEmptySub">
              Go back to Scheduler Setup to add your first course.
            </div>
          </div>
        </div>
      ) : (
        <div className="table pccTable">
          <div className="row head">
            <div>Course</div>
            <div>Exam Date</div>
            <div>Priority</div>
            <div>Actions</div>
          </div>

          {courses.map((c) => {
            const courseQuizzes = quizSets.filter((q) => q.courseId === c.id);

            return (
              <div key={c.id} className="pccCourseBlock">
                <div className="row">
                  <div className="pccCourseName">{c.name}</div>
                  <div>{c.examDate}</div>
                  <div className="pccPriority">{c.workload}</div>

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
                  <div className="pccLinked">
                    <div className="pccLinkedTitle">Linked Quizzes</div>

                    <div className="pccLinkedButtons">
                      {courseQuizzes.map((q) => (
                        <button
                          key={q.id}
                          className="navBtn"
                          type="button"
                          disabled={takingQuizSetId === q.id}
                          onClick={() => onTakeQuizFromPlanner(q.id, 10)}
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

      {(quizError || scheduleError) && (
        <div className="pccErrors">
          {quizError && <div className="errorBox">{quizError}</div>}
          {scheduleError && <div className="errorBox">{scheduleError}</div>}
        </div>
      )}

      <p className="footerNote pccFoot">
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
