import { useState, KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export default function SearchBar({ onSearch }: SearchBarProps) {
  const [query, setQuery] = useState("");

  const handleSearch = () => {
    if (query.trim()) {
      onSearch(query.trim());
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      handleSearch();
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto mb-6">
      <div className="flex gap-2">
        <Input
          type="text"
          placeholder="O que você está procurando?"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          className="flex-1 py-2 rounded-md border-gray-300 focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary text-base"
        />
        <Button
          onClick={handleSearch}
          className="bg-primary hover:bg-primary/90 text-white px-4 rounded-md transition duration-200"
          size="sm"
        >
          <Search className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
