import * as AspectRatioPrimitive from "@radix-ui/react-aspect-ratio"
import * as React from "react";

// Define the cn utility function inline to avoid import issues
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

const AspectRatio = AspectRatioPrimitive.Root

export { AspectRatio }
