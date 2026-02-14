import { useMemo, useState } from "react";
import { resetState } from "./lib/storage";
import "./App.css";
import Start from "./pages/Start";
import Planner from "./pages/Planner";
import QuizBuilder from "./pages/QuizBuilder";

const PAGES = {
  start: { label: "Start", component: Start },
  planner: { label: "Study Planner", component: Planner },
  quiz: { label: "Quiz Builder", component: QuizBuilder },
};

export default function App() {
  const [page, setPage] = useState("start");

  const ActivePage = useMemo(() => PAGES[page].component, [page]);

  return (
    <div className="app">
      <nav className="nav">
        <div className="brand">
          <span className="brandLogo">CL</span>
          <span className="brandText">CramLess</span>
        </div>

        <div className="navLinks">
          <button
            className={page === "start" ? "navBtn active" : "navBtn"}
            onClick={() => setPage("start")}
          >
            Home
          </button>

          <button
            className={page === "planner" ? "navBtn active" : "navBtn"}
            onClick={() => setPage("planner")}
          >
            Study Planner
          </button>

          <button
            className={page === "quiz" ? "navBtn active" : "navBtn"}
            onClick={() => setPage("quiz")}
          >
            Quiz Builder
          </button>
          <button
            className="navBtn"
            onClick={() => {
              resetState();
              window.location.reload();
            }}
          >
            Reset Data
          </button>
        </div>
      </nav>

      <ActivePage />
    </div>
  );
}
