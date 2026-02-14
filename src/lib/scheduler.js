import { toMinutes } from "./time";

/**
 * Generate study sessions between today and the latest exam date.
 * Logic (v1):
 * - Build available day slots (based on selected days + time window + session length)
 * - Compute a weight per course using:
 *   weight = workload * (1 / daysUntilExam)
 * - Fill each slot by choosing the course with the highest remaining "need"
 */

function isoToday() {
  const now = new Date();
  // local date -> YYYY-MM-DD
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function daysBetween(aIso, bIso) {
  const a = new Date(aIso + "T00:00:00");
  const b = new Date(bIso + "T00:00:00");
  const diff = b - a;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function dayLabelFromDate(d) {
  const map = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return map[d.getDay()];
}

function addDays(dateObj, n) {
  const d = new Date(dateObj);
  d.setDate(d.getDate() + n);
  return d;
}

export function generateSchedule({ courses, availability }) {
  if (!courses?.length)
    return { schedule: [], error: "Add at least one course." };

  const days = availability?.days || [];
  if (!days.length)
    return { schedule: [], error: "Select at least one study day." };

  const startTime = availability?.startTime || "18:00";
  const endTime = availability?.endTime || "20:00";
  const sessionMinutes = Number(availability?.sessionMinutes ?? 60);

  const startM = toMinutes(startTime);
  const endM = toMinutes(endTime);

  if (endM <= startM) {
    return { schedule: [], error: "End time must be later than start time." };
  }
  if (sessionMinutes < 15) {
    return {
      schedule: [],
      error: "Session length must be at least 15 minutes.",
    };
  }

  const slotsPerDay = Math.floor((endM - startM) / sessionMinutes);
  if (slotsPerDay < 1) {
    return {
      schedule: [],
      error: "Time window is too small for the session length.",
    };
  }

  const latestExam = courses.reduce(
    (max, c) => (c.examDate > max ? c.examDate : max),
    courses[0].examDate,
  );
  const todayIso = isoToday();
  const horizonDays = daysBetween(todayIso, latestExam);

  if (horizonDays < 1) {
    return {
      schedule: [],
      error: "Your latest exam date must be in the future.",
    };
  }

  // Build all available slots
  const startDate = new Date(todayIso + "T00:00:00");
  const slots = [];
  for (let i = 0; i <= horizonDays; i++) {
    const dateObj = addDays(startDate, i);
    const dayLabel = dayLabelFromDate(dateObj);
    if (!days.includes(dayLabel)) continue;

    const iso =
      dateObj.getFullYear() +
      "-" +
      String(dateObj.getMonth() + 1).padStart(2, "0") +
      "-" +
      String(dateObj.getDate()).padStart(2, "0");

    for (let s = 0; s < slotsPerDay; s++) {
      const start = startM + s * sessionMinutes;
      const end = start + sessionMinutes;
      slots.push({
        date: iso,
        slotIndex: s + 1,
        startMinutes: start,
        endMinutes: end,
      });
    }
  }

  // Course weights + "need"
  const courseStats = courses.map((c) => {
    const dte = Math.max(1, daysBetween(todayIso, c.examDate));
    const weight = Number(c.workload || 5) * (1 / dte);
    return {
      id: c.id,
      name: c.name,
      examDate: c.examDate,
      workload: Number(c.workload || 5),
      daysUntilExam: dte,
      weight,
      need: weight, // initial need
    };
  });

  // Fill slots
  const schedule = slots.map((slot) => {
    // Increase need slightly each round so rotation is stable
    for (const cs of courseStats) cs.need += cs.weight;

    courseStats.sort((a, b) => b.need - a.need);
    const chosen = courseStats[0];
    chosen.need = Math.max(0, chosen.need - 1);

    const daysToExam = Math.max(1, daysBetween(slot.date, chosen.examDate));

    let type = "Focused Study";
    if (daysToExam <= 3) type = "Final Review";
    else if (daysToExam <= 7) type = "Revision";

    return {
      date: slot.date,
      startMinutes: slot.startMinutes,
      endMinutes: slot.endMinutes,
      courseId: chosen.id,
      courseName: chosen.name,
      type,
    };
  });

  return { schedule, error: null };
}
