import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Trainer from "@/pages/Trainer";
import History from "@/pages/History";
import Puzzles from "@/pages/Puzzles";
import Settings from "@/pages/Settings";
import Stats from "@/pages/Stats";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Trainer} />
      <Route path="/history" component={History} />
      <Route path="/puzzles" component={Puzzles} />
      <Route path="/settings" component={Settings} />
      <Route path="/stats" component={Stats} />
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
