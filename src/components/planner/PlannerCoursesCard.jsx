import { useMemo, useState, useEffect } from "react";
import ConfirmModal from "../common/ConfirmModal";
import "./PlannerCoursesCard.css";

export default function PlannerCoursesCard({
  courses = [],
  quizSets = [],
  takingQuizSetId,
  onRemoveCourse,
  onTakeQuizFromPlanner,
  onRemoveExpiredCourses,
  quizError,
  scheduleError,
  onGenerateSchedule,
  onClearSchedule,
}) {
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [hideExpired, setHideExpired] = useState(false);
  const [showCleanupConfirm, setShowCleanupConfirm] = useState(false);
  const [toast, setToast] = useState(null);

  const todayIso = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const expiredIds = useMemo(() => {
    return new Set(
      (courses || [])
        .filter((c) => String(c.examDate || "") < todayIso)
        .map((c) => c.id),
    );
  }, [courses, todayIso]);

  const expiredCount = expiredIds.size;

  const visibleCourses = useMemo(() => {
    if (!hideExpired) return courses;
    return (courses || []).filter((c) => !expiredIds.has(c.id));
  }, [courses, hideExpired, expiredIds]);

  const hasCourses = (courses || []).length > 0;

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

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
          {expiredCount > 0 && (
            <>
              <label className="pccToggle">
                <input
                  type="checkbox"
                  checked={hideExpired}
                  onChange={(e) => setHideExpired(e.target.checked)}
                />
                Hide expired ({expiredCount})
              </label>

              <button
                className="dangerBtn pccDangerSoft"
                type="button"
                onClick={() => setShowCleanupConfirm(true)}
                title="Remove expired courses and their schedule entries"
              >
                Clean up expired
              </button>
            </>
          )}

          <button
            className="primaryBtn"
            type="button"
            onClick={onGenerateSchedule}
            disabled={!hasCourses}
            title={!hasCourses ? "Add at least one course first" : ""}
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

      {!hasCourses ? (
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

          {visibleCourses.map((c) => {
            const isExpired = expiredIds.has(c.id);
            const courseQuizzes = (quizSets || []).filter(
              (q) => q.courseId === c.id,
            );

            return (
              <div
                key={c.id}
                className={`pccCourseBlock ${isExpired ? "isExpired" : ""}`}
              >
                <div className="row">
                  <div className="pccCourseName" title={c.name}>
                    {c.name}
                    {isExpired && (
                      <span className="pccTagExpired">Exam Passed</span>
                    )}
                  </div>

                  <div>{c.examDate || "-"}</div>

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
                          disabled={isExpired || takingQuizSetId === q.id}
                          onClick={() => onTakeQuizFromPlanner(q.id, 10)}
                          title={isExpired ? "Exam date has passed" : ""}
                        >
                          {isExpired
                            ? `Exam Passed: ${q.title}`
                            : takingQuizSetId === q.id
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

      <ConfirmModal
        open={showCleanupConfirm}
        title="Clean up expired courses?"
        message="This will remove all courses whose exam date has passed, and also remove their schedule sessions. This cannot be undone."
        confirmText="Yes, remove expired"
        cancelText="Cancel"
        danger
        onCancel={() => setShowCleanupConfirm(false)}
        onConfirm={() => {
          const removed = onRemoveExpiredCourses?.() || 0;

          if (removed > 0) {
            setToast(
              `${removed} expired course${removed > 1 ? "s" : ""} removed`,
            );
          }

          setShowCleanupConfirm(false);
        }}
      />
      {toast && <div className="pccToast">{toast}</div>}
    </div>
  );
}
