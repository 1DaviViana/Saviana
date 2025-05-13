import React from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import { Router } from "wouter";
import "./index.css";
import { setupEnvironmentVars } from "./env-setup";

// Configura variáveis de ambiente e API keys
setupEnvironmentVars();

// Determina a base do router dependendo do ambiente
const getBasePath = () => {
  // No ambiente de desenvolvimento (Replit), não usamos base path
  if (import.meta.env.DEV) {
    console.log("Ambiente de desenvolvimento: sem base path");
    return "";
  }
  // Em produção (GitHub Pages), usamos /Saviana/
  console.log("Ambiente de produção: usando base path /Saviana");
  return "/Saviana";
};

createRoot(document.getElementById("root")!).render(
  <Router base={getBasePath()}>
    <App />
  </Router>
);
