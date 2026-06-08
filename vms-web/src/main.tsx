import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@workspace/api-client-react";

// In production (Vercel), VITE_API_BASE_URL is set to the Railway API URL.
// In local development, this variable is unset and the Vite proxy
// forwards /api/* requests to localhost:8080 automatically.
const apiBase = import.meta.env.VITE_API_BASE_URL;
if (apiBase) {
  setBaseUrl(apiBase);
}

createRoot(document.getElementById("root")!).render(<App />);