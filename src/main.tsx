import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPerformanceMonitoring } from "./lib/performance-monitor";
import { deferThirdPartyScripts, optimizeScriptLoading } from "./lib/script-optimizer";

// Initialize performance monitoring in production
if (import.meta.env.PROD) {
  initPerformanceMonitoring(
    // Optional: send metrics to your analytics endpoint
    // import.meta.env.VITE_ANALYTICS_ENDPOINT
  );
}

// Optimize script loading
optimizeScriptLoading();

// Defer third-party scripts to not block main content
deferThirdPartyScripts();

createRoot(document.getElementById("root")!).render(<App />);
