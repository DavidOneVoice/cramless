import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import "react-datepicker/dist/react-datepicker.css";

const CHUNK_RELOAD_GUARD_KEY = "cramless:chunk-reload-attempted";

/**
 * Handles stale/deleted chunk failures after a new deployment.
 * If a lazy-loaded module fails to fetch once, force a full reload so the
 * browser picks up the latest index/chunk manifest. Guarded to avoid loops.
 */
function reloadOnChunkErrorOnce() {
  const alreadyRetried = sessionStorage.getItem(CHUNK_RELOAD_GUARD_KEY) === "1";
  if (alreadyRetried) return;
  sessionStorage.setItem(CHUNK_RELOAD_GUARD_KEY, "1");
  window.location.reload();
}

window.addEventListener("vite:preloadError", (event) => {
  event.preventDefault();
  reloadOnChunkErrorOnce();
});

window.addEventListener("unhandledrejection", (event) => {
  const reason = String(event.reason ?? "");
  if (reason.includes("Failed to fetch dynamically imported module")) {
    reloadOnChunkErrorOnce();
  }
});

window.addEventListener("load", () => {
  sessionStorage.removeItem(CHUNK_RELOAD_GUARD_KEY);
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
