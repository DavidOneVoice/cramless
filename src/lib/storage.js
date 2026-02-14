const STORAGE_KEY = "cramless_v1";

/**
 * Shape:
 * {
 *   courses: [],
 *   availability: {},
 *   schedule: [],
 *   quizSets: []
 * }
 */

function getDefaultState() {
  return {
    courses: [],
    availability: {
      days: [], // e.g. ["Mon","Tue"]
      startTime: "18:00",
      endTime: "20:00",
      sessionMinutes: 60,
    },
    schedule: [],
    quizSets: [],
  };
}

export function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaultState();
    const parsed = JSON.parse(raw);

    // Basic safety merge (so missing fields don’t crash)
    const base = getDefaultState();
    return {
      ...base,
      ...parsed,
      availability: { ...base.availability, ...(parsed.availability || {}) },
    };
  } catch (err) {
    console.error("loadState error:", err);
    return getDefaultState();
  }
}

export function saveState(state) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.error("saveState error:", err);
  }
}

export function resetState() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (err) {
    console.error("resetState error:", err);
  }
}
