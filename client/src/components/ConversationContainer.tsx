import { useState, KeyboardEvent } from "react";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { LightbulbIcon } from "lucide-react";

interface ConversationContainerProps {
  question: string;
  userResponse: string;
  hasResponded: boolean;
  onSubmitResponse: (response: string) => void;
  loading?: boolean; // Adicionando propriedade de loading opcional
}

export default function ConversationContainer({
  question,
  userResponse,
  hasResponded,
  onSubmitResponse,
  loading = false, // Valor padrão para loading
}: ConversationContainerProps) {
  const [inputValue, setInputValue] = useState("");

  const handleSubmit = () => {
    if (inputValue.trim()) {
      onSubmitResponse(inputValue.trim());
      setInputValue("");
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && inputValue.trim()) {
      handleSubmit();
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto mb-4 fade-in">
      <div className="bg-gray-50 rounded-md p-3 mb-2 border border-gray-100 fade-in">
        <p className="text-gray-700 text-sm">{question}</p>

        {!hasResponded ? (
          <div className="mt-3 flex gap-2">
            <Input
              type="text"
              placeholder="Digite sua resposta..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              className="flex-1 rounded-md border-gray-200 text-sm focus:ring-1 focus:ring-primary"
            />
            <Button
              onClick={handleSubmit}
              className="bg-primary hover:bg-primary/90 text-white rounded-md"
              size="sm"
            >
              Ok
            </Button>
          </div>
        ) : (
          <div className="mt-2 text-sm text-primary font-medium">
            "{userResponse}"
          </div>
        )}
      </div>

      {hasResponded && loading && (
        <div className="text-center py-2" data-testid="conversation-loading">
          <div className="inline-block">
            <svg className="animate-spin h-5 w-5 text-primary mx-auto" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
        </div>
      )}
    </div>
  );
}
