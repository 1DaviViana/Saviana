"use client";
"use strict";
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CarouselNext = exports.CarouselPrevious = exports.CarouselItem = exports.CarouselContent = void 0;
exports.Carousel = Carousel;
var React = __importStar(require("react"));
var lucide_react_1 = require("lucide-react");
var embla_carousel_react_1 = __importDefault(require("embla-carousel-react"));
var button_1 = require("@/components/ui/button");
// Define the cn utility function inline to avoid import issues
function cn() {
    var inputs = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        inputs[_i] = arguments[_i];
    }
    return inputs.filter(Boolean).join(" ");
}
var CarouselContext = React.createContext(null);
function useCarousel() {
    var context = React.useContext(CarouselContext);
    if (!context) {
        throw new Error("useCarousel must be used within a <Carousel />");
    }
    return context;
}
function Carousel(_a) {
    var opts = _a.opts, plugins = _a.plugins, _b = _a.orientation, orientation = _b === void 0 ? "horizontal" : _b, setApi = _a.setApi, children = _a.children, props = __rest(_a, ["opts", "plugins", "orientation", "setApi", "children"]);
    var _c = (0, embla_carousel_react_1.default)(__assign(__assign({}, opts), { axis: orientation === "horizontal" ? "x" : "y" }), plugins), carouselRef = _c[0], api = _c[1];
    var _d = React.useState(false), canScrollPrev = _d[0], setCanScrollPrev = _d[1];
    var _e = React.useState(false), canScrollNext = _e[0], setCanScrollNext = _e[1];
    var onSelect = React.useCallback(function (api) {
        if (!api) {
            return;
        }
        setCanScrollPrev(api.canScrollPrev());
        setCanScrollNext(api.canScrollNext());
    }, []);
    var scrollPrev = React.useCallback(function () {
        api === null || api === void 0 ? void 0 : api.scrollPrev();
    }, [api]);
    var scrollNext = React.useCallback(function () {
        api === null || api === void 0 ? void 0 : api.scrollNext();
    }, [api]);
    var handleKeyDown = React.useCallback(function (event) {
        if (event.key === "ArrowLeft") {
            event.preventDefault();
            scrollPrev();
        }
        else if (event.key === "ArrowRight") {
            event.preventDefault();
            scrollNext();
        }
    }, [scrollPrev, scrollNext]);
    React.useEffect(function () {
        if (!api || !setApi) {
            return;
        }
        setApi(api);
    }, [api, setApi]);
    React.useEffect(function () {
        if (!api) {
            return;
        }
        onSelect(api);
        api.on("reInit", onSelect);
        api.on("select", onSelect);
        return function () {
            api === null || api === void 0 ? void 0 : api.off("select", onSelect);
        };
    }, [api, onSelect]);
    return (React.createElement(CarouselContext.Provider, { value: {
            carouselRef: carouselRef,
            api: api,
            scrollPrev: scrollPrev,
            scrollNext: scrollNext,
            canScrollPrev: canScrollPrev,
            canScrollNext: canScrollNext,
        } },
        React.createElement("div", __assign({ ref: function (ref) {
                if (ref)
                    carouselRef(ref);
            }, onKeyDownCapture: handleKeyDown, className: cn("relative", orientation === "horizontal" ? "w-full" : "h-full"), role: "region", "aria-roledescription": "carousel" }, props), children)));
}
var CarouselContent = React.forwardRef(function (_a, ref) {
    var className = _a.className, props = __rest(_a, ["className"]);
    var carouselRef = useCarousel().carouselRef;
    return (React.createElement("div", { ref: carouselRef, className: "overflow-hidden" },
        React.createElement("div", __assign({ ref: ref, className: cn("flex", className) }, props))));
});
exports.CarouselContent = CarouselContent;
CarouselContent.displayName = "CarouselContent";
var CarouselItem = React.forwardRef(function (_a, ref) {
    var className = _a.className, props = __rest(_a, ["className"]);
    return (React.createElement("div", __assign({ ref: ref, role: "group", "aria-roledescription": "slide", className: cn("min-w-0 shrink-0 grow-0 basis-full", className) }, props)));
});
exports.CarouselItem = CarouselItem;
CarouselItem.displayName = "CarouselItem";
var CarouselPrevious = React.forwardRef(function (_a, ref) {
    var className = _a.className, _b = _a.variant, variant = _b === void 0 ? "outline" : _b, _c = _a.size, size = _c === void 0 ? "icon" : _c, props = __rest(_a, ["className", "variant", "size"]);
    var _d = useCarousel(), scrollPrev = _d.scrollPrev, canScrollPrev = _d.canScrollPrev;
    return (React.createElement(button_1.Button, __assign({ ref: ref, variant: variant, size: size, className: cn("absolute h-8 w-8 rounded-full", className), disabled: !canScrollPrev, onClick: scrollPrev }, props),
        React.createElement(lucide_react_1.ArrowLeft, { className: "h-4 w-4" }),
        React.createElement("span", { className: "sr-only" }, "Previous slide")));
});
exports.CarouselPrevious = CarouselPrevious;
CarouselPrevious.displayName = "CarouselPrevious";
var CarouselNext = React.forwardRef(function (_a, ref) {
    var className = _a.className, _b = _a.variant, variant = _b === void 0 ? "outline" : _b, _c = _a.size, size = _c === void 0 ? "icon" : _c, props = __rest(_a, ["className", "variant", "size"]);
    var _d = useCarousel(), scrollNext = _d.scrollNext, canScrollNext = _d.canScrollNext;
    return (React.createElement(button_1.Button, __assign({ ref: ref, variant: variant, size: size, className: cn("absolute h-8 w-8 rounded-full", className), disabled: !canScrollNext, onClick: scrollNext }, props),
        React.createElement(lucide_react_1.ArrowRight, { className: "h-4 w-4" }),
        React.createElement("span", { className: "sr-only" }, "Next slide")));
});
exports.CarouselNext = CarouselNext;
CarouselNext.displayName = "CarouselNext";
