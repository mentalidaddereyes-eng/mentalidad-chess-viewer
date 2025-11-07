import React, { Suspense, lazy, useEffect, useState } from "react";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { UpdateNotification } from "@/components/UpdateNotification";
import { PlanBanner } from "@/components/PlanBanner"; // Cost Saver Pack v6.0
import { TrialBanner } from "@/components/TrialBanner"; // feat(subscriptions)
import UpgradeModal from "@/components/UpgradeModal";
import ChessComHeader from "@/components/ChessComHeader";

const Trainer = lazy(() => import("@/pages/Trainer"));
const History = lazy(() => import("@/pages/History"));
const Puzzles = lazy(() => import("@/pages/Puzzles"));
const Settings = lazy(() => import("@/pages/Settings"));
const Stats = lazy(() => import("@/pages/Stats"));
const NotFound = lazy(() => import("@/pages/not-found"));

function Fallback() {
  return (
    <div className="w-full h-full flex items-center justify-center p-6">
      Cargando...
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<Fallback />}>
      <Switch>
        <Route path="/" component={Trainer} />
        <Route path="/history" component={History} />
        <Route path="/puzzles" component={Puzzles} />
        <Route path="/settings" component={Settings} />
        <Route path="/stats" component={Stats} />
        <Route component={NotFound} />
      </Switch>
    </Suspense>
  );
}

function App() {
  const [upgradeOpen, setUpgradeOpen] = useState(false);

  useEffect(() => {
    function onTrialEnded(e: any) {
      // open upgrade modal when trial ends
      setUpgradeOpen(true);
    }
    function onOpenUpgrade(e: any) {
      setUpgradeOpen(true);
    }

    window.addEventListener("trial-ended", onTrialEnded as EventListener);
    window.addEventListener("open-upgrade-modal", onOpenUpgrade as EventListener);

    return () => {
      window.removeEventListener("trial-ended", onTrialEnded as EventListener);
      window.removeEventListener("open-upgrade-modal", onOpenUpgrade as EventListener);
    };
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <UpdateNotification />
        <PlanBanner />
        <TrialBanner />
        <Toaster />
        <ChessComHeader />
        <Router />
        <UpgradeModal open={upgradeOpen} onOpenChange={setUpgradeOpen} />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
