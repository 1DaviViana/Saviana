// Build timestamp: 2025-05-12T10:30:00Z
// ou
// Build ID: 12345 
import * as React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { Router } from "wouter";
import "./index.css";

// Determina a base do router dependendo do ambiente
const getBasePath = () => {
  // No ambiente de desenvolvimento (Replit), não usamos base path
  if (import.meta.env.DEV) {
    return "";
  }
  // Em produção (GitHub Pages), usamos /Saviana/
  return "/Saviana";
};

createRoot(document.getElementById("root")!).render(
  <Router base={getBasePath()}>
    <App />
  </Router>
);
