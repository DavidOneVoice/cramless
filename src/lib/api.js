// src/lib/api.js

/**
 * Resolves the backend base URL for API requests.
 *
 * Priority:
 * 1) VITE_API_BASE (explicit env override)
 * 2) Local dev default (http://localhost:5050)
 * 3) Production hosted backend
 */
function resolveApiBase() {
  const fromEnv = String(import.meta?.env?.VITE_API_BASE || "").trim();
  if (fromEnv) return fromEnv.replace(/\/+$/, "");

  const host = String(window?.location?.hostname || "").toLowerCase();
  const isLocalHost =
    host === "localhost" || host === "127.0.0.1" || host === "::1";

  if (isLocalHost) return "http://localhost:5050";
  return "https://cramless.onrender.com";
}

export const API_BASE = resolveApiBase();
