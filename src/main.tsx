import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

// Apply saved or system-preferred theme before the first render
(function initTheme() {
  const stored = localStorage.getItem("spindle-theme");
  const prefersLight = window.matchMedia("(prefers-color-scheme: light)").matches;
  const theme = stored === "light" || stored === "dark" ? stored : prefersLight ? "light" : "dark";
  document.documentElement.setAttribute("data-theme", theme);
})();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
