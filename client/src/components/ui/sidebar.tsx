"use client"

import * as React from "react"
import { LucideIcon } from "lucide-react"

import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from "@/components/ui/sheet"

// Define the cn utility function inline to avoid import issues
function cn(...inputs: any[]) {
  return inputs.filter(Boolean).join(" ")
}

interface NavProps {
  isCollapsed: boolean
  links: {
    title: string
    label?: string
    icon: LucideIcon
    variant: "default" | "ghost"
  }[]
}

export function Nav({ links, isCollapsed }: NavProps) {
  return (
    <div
      data-collapsed={isCollapsed}
      className="group flex flex-col gap-4 py-2 data-[collapsed=true]:py-2"
    >
      <nav className="grid gap-1 px-2 group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-2">
        {links.map((link, index) => 
          isCollapsed ? (
            <TooltipProvider key={index}>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div
                    className={cn(
                      "flex flex-1 items-center justify-center rounded-md p-2 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent",
                      link.variant === "default" &&
                        "bg-accent text-accent-foreground"
                    )}
                  >
                    <link.icon className="h-5 w-5" />
                    <span className="sr-only">{link.title}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="flex items-center gap-4">
                  {link.title}
                  {link.label && (
                    <span className="ml-auto text-muted-foreground">
                      {link.label}
                    </span>
                  )}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Sheet key={index}>
              <SheetTrigger asChild>
                <div
                  className={cn(
                    "flex flex-1 items-center justify-between rounded-md px-2 py-1.5 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent",
                    link.variant === "default" &&
                      "bg-accent text-accent-foreground"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <link.icon className="h-5 w-5" />
                    <div>{link.title}</div>
                  </div>
                  {link.label && (
                    <div className="text-xs text-muted-foreground">
                      {link.label}
                    </div>
                  )}
                </div>
              </SheetTrigger>
              <SheetContent side="left" className="w-full max-w-md sm:max-w-lg">
                <div className="grid gap-4">
                  <div className="flex flex-col gap-2">
                    <div className="text-sm font-medium">
                      {link.title} {link.label && <span>({link.label})</span>}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Add contents for {link.title}
                    </div>
                  </div>
                  <SheetClose />
                </div>
              </SheetContent>
            </Sheet>
          )
        )}
      </nav>
    </div>
  )
}
