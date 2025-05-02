import { useState } from 'react';
import { Card, CardContent } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { ScrollArea } from "../components/ui/scroll-area";

interface LogEntry {
  timestamp: string;
  source: string;
  data: any;
}

interface DebugLogsProps {
  logs: LogEntry[];
}

export default function DebugLogs({ logs }: DebugLogsProps) {
  const [expanded, setExpanded] = useState(true);

  if (logs.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-0 right-0 z-50 w-full max-w-xl p-2">
      <Card className="bg-black/90 text-white border-gray-700 shadow-lg">
        <div className="flex justify-between items-center p-2 border-b border-gray-700">
          <h3 className="text-sm font-mono">API Debug Logs ({logs.length})</h3>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 text-gray-300 hover:text-white" 
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? '▼' : '▲'}
          </Button>
        </div>
        
        {expanded && (
          <CardContent className="p-0">
            <ScrollArea className="h-64">
              <div className="p-2 space-y-2 font-mono text-xs">
                {logs.map((log, index) => (
                  <div key={index} className="border-b border-gray-700 pb-2">
                    <div className="flex justify-between mb-1">
                      <span className="text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</span>
                      <span className={
                        log.source === 'OpenAI' 
                          ? 'text-green-400' 
                          : log.source.includes('Requisição') 
                            ? 'text-yellow-400'
                            : 'text-blue-400'
                      }>
                        {log.source}
                      </span>
                    </div>
                    
                    {/* Destacar informações de coordenadas para logs de requisição */}
                    {log.source.includes('Requisição') && log.data.coords && (
                      <div className="mb-2 bg-slate-800 p-1 rounded">
                        <p className="text-white">
                          Coordenadas: {log.data.hasCoords ? (
                            <span className="text-green-400">
                              {log.data.coords.latitude}, {log.data.coords.longitude}
                            </span>
                          ) : (
                            <span className="text-red-400">
                              Não disponíveis {log.data.geoError ? `(${log.data.geoError})` : ''}
                            </span>
                          )}
                        </p>
                      </div>
                    )}
                    
                    {/* Destacar quando for uma resposta com resultados de geolocalização */}
                    {log.source === 'API Response' && log.data && log.data.geoSource && (
                      <div className="mb-2 bg-slate-800 p-1 rounded">
                        <p className="text-white">
                          Fonte de localização: 
                          <span className={log.data.geoSource === 'browser' ? 'text-blue-400 ml-1' : 'text-yellow-400 ml-1'}>
                            {log.data.geoSource === 'browser' ? 'Navegador' : 'Fallback (São Paulo)'}
                          </span>
                        </p>
                      </div>
                    )}
                    
                    <pre className="whitespace-pre-wrap overflow-auto max-h-40 bg-black/80 p-1 rounded">
                      {typeof log.data === 'string' 
                        ? log.data 
                        : JSON.stringify(log.data, null, 2)
                      }
                    </pre>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        )}
      </Card>
    </div>
  );
}