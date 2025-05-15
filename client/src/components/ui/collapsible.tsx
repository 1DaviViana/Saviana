"use client"

import * as CollapsiblePrimitive from "@radix-ui/react-collapsible"
import * as React from "react";

// Define the cn utility function inline to avoid import issues
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ");
}

const Collapsible = CollapsiblePrimitive.Root

const CollapsibleTrigger = CollapsiblePrimitive.CollapsibleTrigger

const CollapsibleContent = CollapsiblePrimitive.CollapsibleContent

export { Collapsible, CollapsibleTrigger, CollapsibleContent }
