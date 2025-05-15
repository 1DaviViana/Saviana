import * as React from "react"
import { cn } from "../../lib/utils"

// Define the cn utility function inline to avoid import issues
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-muted", className)}
      {...props}
    />
  )
}

export { Skeleton }
