import { createRoot } from "react-dom/client";
import App from "./App";
import { ErrorBoundary } from "./components/ui/ErrorBoundary";
import "./index.css";
import { initPerformanceTelemetry } from "./lib/telemetry";

// Iniciar telemetría de observabilidad M12
initPerformanceTelemetry();

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
