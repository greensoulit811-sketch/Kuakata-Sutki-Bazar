import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initPerformanceMonitoring } from "./lib/performance-monitor";

// Initialize performance monitoring in production
if (import.meta.env.PROD) {
  initPerformanceMonitoring(
    // Optional: send metrics to your analytics endpoint
    // import.meta.env.VITE_ANALYTICS_ENDPOINT
  );
}

createRoot(document.getElementById("root")!).render(<App />);
