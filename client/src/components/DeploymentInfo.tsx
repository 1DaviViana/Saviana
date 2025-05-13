import React, { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";

/**
 * Componente que exibe informações do ambiente de deploy atual
 * Útil para debugar problemas de deployment
 */
export function DeploymentInfo() {
  const [buildDate, setBuildDate] = useState<string>("");
  
  useEffect(() => {
    // Marca o momento do build/carregamento
    setBuildDate(new Date().toISOString());
  }, []);
  
  return (
    <Card className="w-full mb-4 bg-slate-50 dark:bg-slate-900 shadow-md">
      <CardHeader>
        <CardTitle className="text-lg">Informações de Deployment</CardTitle>
        <CardDescription>Versão: 1.0.1 - {buildDate}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="text-sm space-y-2">
          <p>
            <strong>Ambiente:</strong> {import.meta.env.DEV ? "Desenvolvimento" : "Produção"}
          </p>
          <p>
            <strong>Base Path:</strong> {import.meta.env.BASE_URL || "/"}
          </p>
          <p>
            <strong>API URL:</strong> {import.meta.env.VITE_API_URL || "Local"}
          </p>
          <p>
            <strong>Data de Build:</strong> {buildDate}
          </p>
          <p>
            <strong>UA:</strong> {navigator.userAgent}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}