"use client"

import * as React from 'react';
import { GripVertical } from "lucide-react";
import * as ResizablePrimitive from "react-resizable-panels";

// Define the cn utility function inline to avoid import issues
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(' ');
}

function ResizablePanelGroup(props: React.ComponentProps<typeof ResizablePrimitive.PanelGroup>) {
  const { className, ...rest } = props;
  return React.createElement(
    ResizablePrimitive.PanelGroup,
    {
      className: cn(
        "flex h-full w-full data-[panel-group-direction=vertical]:flex-col",
        className
      ),
      ...rest
    }
  );
}

// Use the Panel directly
const ResizablePanel = ResizablePrimitive.Panel;

// Define the interface for ResizableHandle props
interface ResizableHandleProps extends React.ComponentProps<typeof ResizablePrimitive.PanelResizeHandle> {
  withHandle?: boolean;
}

function ResizableHandle(props: ResizableHandleProps) {
  const { withHandle, className, ...rest } = props;
  
  return React.createElement(
    ResizablePrimitive.PanelResizeHandle,
    {
      className: cn(
        "relative flex w-px items-center justify-center bg-border after:absolute after:inset-y-0 after:left-1/2 after:w-1 after:-translate-x-1/2 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 data-[panel-group-direction=vertical]:h-px data-[panel-group-direction=vertical]:w-full data-[panel-group-direction=vertical]:after:left-0 data-[panel-group-direction=vertical]:after:h-1 data-[panel-group-direction=vertical]:after:w-full data-[panel-group-direction=vertical]:after:-translate-y-1/2 data-[panel-group-direction=vertical]:after:translate-x-0 [&[data-panel-group-direction=vertical]>div]:rotate-90",
        className
      ),
      ...rest
    },
    withHandle ? 
      React.createElement(
        'div',
        { className: "z-10 flex h-4 w-3 items-center justify-center rounded-sm border bg-border" },
        React.createElement(GripVertical, { className: "h-2.5 w-2.5" })
      ) : 
      null
  );
}

export { ResizablePanelGroup, ResizablePanel, ResizableHandle };
