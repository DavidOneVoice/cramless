import { useEffect, useMemo, useState } from "react";
import { resetState } from "./lib/storage";
import "./App.css";
import Summaries from "./pages/Summaries";
import Start from "./pages/Start";
import Planner from "./pages/Planner";
import QuizBuilder from "./pages/QuizBuilder";
import Schedule from "./pages/Schedule";

const PAGES = {
  start: { label: "Start", component: Start },
  planner: { label: "Study Planner", component: Planner },
  schedule: { label: "Schedule", component: Schedule },
  quiz: { label: "Quiz Builder", component: QuizBuilder },
  summaries: { label: "Summaries", component: Summaries },
};

function getHashPage() {
  const raw = window.location.hash || "#/start";
  const key = raw.replace("#/", "").split("?")[0].trim(); // ✅ IMPORTANT
  return PAGES[key] ? key : "start";
}

export default function App() {
  const [page, setPage] = useState(() => getHashPage());

  useEffect(() => {
    const onHashChange = () => setPage(getHashPage());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  const ActivePage = useMemo(() => PAGES[page].component, [page]);

  function go(to) {
    window.location.hash = `#/${to}`;
  }

  return (
    <div className="app">
      <nav className="nav">
        <div>
          <button
            className="brand"
            onClick={() => go("start")}
            aria-label="Go to Home"
            type="button"
          >
            <img src="/logo.png" alt="CramLess logo" className="brandIcon" />
            <span className="brandText">
              <span className="brandCram">Cram</span>
              <span className="brandLess">Less</span>
            </span>
          </button>

          <p className="subtitle">A Smart Study Planner & Quiz Builder</p>
        </div>

        <div className="navLinks">
          <button
            className={page === "start" ? "navBtn active" : "navBtn"}
            onClick={() => go("start")}
            type="button"
          >
            Home
          </button>

          <button
            className={page === "planner" ? "navBtn active" : "navBtn"}
            onClick={() => go("planner")}
            type="button"
          >
            Study Planner
          </button>

          <button
            className={page === "schedule" ? "navBtn active" : "navBtn"}
            onClick={() => go("schedule")}
            type="button"
          >
            Schedule
          </button>

          <button
            className={page === "quiz" ? "navBtn active" : "navBtn"}
            onClick={() => go("quiz")}
            type="button"
          >
            Quiz Builder
          </button>
          <button
            className={page === "summaries" ? "navBtn active" : "navBtn"}
            onClick={() => go("summaries")}
            type="button"
          >
            Summaries
          </button>

          <button
            className="navBtn"
            onClick={() => {
              resetState();
              window.location.hash = "#/start";
              window.location.reload();
            }}
            type="button"
          >
            Reset Data
          </button>
        </div>
      </nav>

      <ActivePage />
    </div>
  );
}
