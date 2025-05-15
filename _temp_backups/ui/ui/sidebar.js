"use client";
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Nav = Nav;
var React = __importStar(require("react"));
var tooltip_1 = require("@/components/ui/tooltip");
var sheet_1 = require("@/components/ui/sheet");
// Define the cn utility function inline to avoid import issues
function cn() {
    var inputs = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        inputs[_i] = arguments[_i];
    }
    return inputs.filter(Boolean).join(" ");
}
function Nav(_a) {
    var links = _a.links, isCollapsed = _a.isCollapsed;
    return (React.createElement("div", { "data-collapsed": isCollapsed, className: "group flex flex-col gap-4 py-2 data-[collapsed=true]:py-2" },
        React.createElement("nav", { className: "grid gap-1 px-2 group-[[data-collapsed=true]]:justify-center group-[[data-collapsed=true]]:px-2" }, links.map(function (link, index) {
            return isCollapsed ? (React.createElement(tooltip_1.TooltipProvider, { key: index },
                React.createElement(tooltip_1.Tooltip, { delayDuration: 0 },
                    React.createElement(tooltip_1.TooltipTrigger, { asChild: true },
                        React.createElement("div", { className: cn("flex flex-1 items-center justify-center rounded-md p-2 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent", link.variant === "default" &&
                                "bg-accent text-accent-foreground") },
                            React.createElement(link.icon, { className: "h-5 w-5" }),
                            React.createElement("span", { className: "sr-only" }, link.title))),
                    React.createElement(tooltip_1.TooltipContent, { side: "right", className: "flex items-center gap-4" },
                        link.title,
                        link.label && (React.createElement("span", { className: "ml-auto text-muted-foreground" }, link.label)))))) : (React.createElement(sheet_1.Sheet, { key: index },
                React.createElement(sheet_1.SheetTrigger, { asChild: true },
                    React.createElement("div", { className: cn("flex flex-1 items-center justify-between rounded-md px-2 py-1.5 text-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent", link.variant === "default" &&
                            "bg-accent text-accent-foreground") },
                        React.createElement("div", { className: "flex items-center gap-3" },
                            React.createElement(link.icon, { className: "h-5 w-5" }),
                            React.createElement("div", null, link.title)),
                        link.label && (React.createElement("div", { className: "text-xs text-muted-foreground" }, link.label)))),
                React.createElement(sheet_1.SheetContent, { side: "left", className: "w-full max-w-md sm:max-w-lg" },
                    React.createElement("div", { className: "grid gap-4" },
                        React.createElement("div", { className: "flex flex-col gap-2" },
                            React.createElement("div", { className: "text-sm font-medium" },
                                link.title,
                                " ",
                                link.label && React.createElement("span", null,
                                    "(",
                                    link.label,
                                    ")")),
                            React.createElement("div", { className: "text-sm text-muted-foreground" },
                                "Add contents for ",
                                link.title)),
                        React.createElement(sheet_1.SheetClose, null)))));
        }))));
}
