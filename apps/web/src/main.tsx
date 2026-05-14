import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import posthog from "posthog-js";

import "./index.css";
import App from "./App.tsx";

posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
  api_host: "https://us.i.posthog.com",
  defaults: "2026-01-30",
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
