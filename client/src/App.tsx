import { Switch, Route, useRouter } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import NotFound from "./pages/not-found";
import Home from "./pages/home";

// Base path for GitHub Pages
const basePath = "/Saviana";

// Custom hook to use wouter with GitHub Pages
function useHashRouter() {
  // Get the original router hooks
  const [, navigate] = useRouter();

  // Return a new router with the base path prefixed
  return {
    navigate: (to: string) => navigate(basePath + to)
  };
}

function Router() {
  return (
    <Switch base={basePath}>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
