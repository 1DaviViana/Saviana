import { cn } from "../../lib/utils";

interface MapPinProps {
  name: string;
  className?: string;
}

export function MapPin({ name, className }: MapPinProps) {
  return (
    <div className="relative">
      <div className="animate-bounce">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={cn("h-8 w-8 text-primary drop-shadow-lg", className)}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z"
            clipRule="evenodd"
          />
        </svg>
      </div>
      <div className="absolute -bottom-6 left-1/2 transform -translate-x-1/2 whitespace-nowrap bg-white px-2 py-1 rounded-md shadow-md text-xs font-medium">
        {name}
      </div>
    </div>
  );
}
