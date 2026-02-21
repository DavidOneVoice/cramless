import { useEffect, useMemo, useState } from "react";
import { resetState } from "./lib/storage";
import "./App.css";
import "./styles/ui.css";
import QuizSetDetails from "./pages/QuizSetDetails";
import Start from "./pages/Start";
import Planner from "./pages/Planner";
import Schedule from "./pages/Schedule";
import QuizBuilder from "./pages/QuizBuilder";
import Summaries from "./pages/Summaries";
import QuizSets from "./pages/QuizSets";
import CBTRoom from "./pages/CBTRoom";

const PAGES = {
  start: { label: "Start", component: Start },
  planner: { label: "Study Planner", component: Planner },
  schedule: { label: "Schedule", component: Schedule },
  quiz: { label: "Quiz Builder", component: QuizBuilder },
  quizSets: { label: "Quiz Sets", component: QuizSets },
  summaries: { label: "Summaries", component: Summaries },
  quizSet: { label: "Quiz Set", component: QuizSetDetails },
  cbt: { label: "CBT Room", component: CBTRoom },
};

function normalizeHashKey(rawHash) {
  const raw = rawHash || "#/start";

  let key = raw.replace(/^#\/?/, "");
  key = key.split("?")[0].trim();
  key = key.replace(/\/+$/, "");
  const lower = key.toLowerCase();

  const ALIASES = {
    "": "start",
    start: "start",
    home: "start",
    planner: "planner",
    schedule: "schedule",
    timetable: "schedule",
    quiz: "quiz",
    quizbuilder: "quiz",
    summaries: "summaries",
    summary: "summaries",
    quizsets: "quizSets",
    "quiz-sets": "quizSets",
    quizset: "quizSet",
    "quiz-set": "quizSet",
    quizsetdetails: "quizSet",
    "quiz-set-details": "quizSet",
    cbt: "cbt",
    practice: "cbt",
    exam: "cbt",
    cbtr: "cbt",
  };

  return ALIASES[lower] || key;
}

function getHashPage() {
  const normalized = normalizeHashKey(window.location.hash);
  return PAGES[normalized] ? normalized : "start";
}

export default function App() {
  const [page, setPage] = useState(() => getHashPage());
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const onHashChange = () => setPage(getHashPage());
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, []);

  useEffect(() => {
    // close mobile menu on page change
    setMenuOpen(false);
  }, [page]);

  const ActivePage = useMemo(() => PAGES[page].component, [page]);

  function go(to) {
    setPage(PAGES[to] ? to : "start");
    window.location.hash = `#/${to}`;
  }

  return (
    <div className="app">
      <nav className="nav">
        <div className="navLeft">
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

          <p className="subtitle">A Smart Study Planner &amp; Quiz Builder.</p>
        </div>

        <button
          className="menuBtn"
          type="button"
          aria-label="Toggle menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span className="menuDot" />
          <span className="menuDot" />
          <span className="menuDot" />
        </button>

        <div className={menuOpen ? "navLinks open" : "navLinks"}>
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
            className={page === "quizSets" ? "navBtn active" : "navBtn"}
            onClick={() => go("quizSets")}
            type="button"
          >
            Quiz Sets
          </button>

          <button
            className={page === "summaries" ? "navBtn active" : "navBtn"}
            onClick={() => go("summaries")}
            type="button"
          >
            Summaries
          </button>

          <button
            className="navBtn danger"
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

      <main className="page">
        <ActivePage />
      </main>
    </div>
  );
}
