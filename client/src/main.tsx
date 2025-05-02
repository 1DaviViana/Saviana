import { createRoot } from "react-dom/client";
import App from "./App";
import { Router } from "wouter";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <Router base="/Saviana">
    <App />
  </Router>
);
