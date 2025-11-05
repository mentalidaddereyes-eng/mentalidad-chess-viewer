// Cost Saver Pack v6.0: Plan banner with Pro/Free/Elite switcher + trial promo

import React, { useState, useEffect } from "react";
import { Crown, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getPlanMode, setPlanMode } from "@/lib/plan-manager";
import type { PlanMode } from "@shared/types";
import { useQuery } from "@tanstack/react-query";

type PlanApiResponse = {
  plan: string;
  trial: {
    eligible: boolean;
    usedToday: boolean;
    remainingMs: number;
  };
};

export function PlanBanner(): JSX.Element {
  const [planMode, setPlanModeState] = useState<PlanMode>("free");
  const [dialogOpen, setDialogOpen] = useState(false);

  // Query server plan/trial info
  const { data: planApi } = useQuery<PlanApiResponse>({
    queryKey: ["/api/plan"],
    // refetch occasionally in background
    refetchInterval: 5000,
    retry: false,
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    const currentPlan = getPlanMode();
    setPlanModeState(currentPlan);
  }, []);

  const handleSwitchPlan = (newPlan: PlanMode) => {
    setPlanMode(newPlan);
    setPlanModeState(newPlan);
    setDialogOpen(false);
    // reload to apply provider changes
    window.location.reload();
  };

  const isPro = planMode === "pro";
  const isElite = planMode === "elite";

  // Show trial promo if server reports FREE with eligible trial
  const showTrialPromo =
    planApi && planApi.plan === "free" && planApi.trial?.eligible && !planApi.trial?.usedToday;

  const remainingMin = Math.max(1, Math.ceil((planApi?.trial?.remainingMs || 0) / 60000));

  return (
    <>
      {showTrialPromo ? (
        <div
          className="bg-green-600 text-white text-xs px-4 py-1 text-center"
          data-testid="trial-top-banner"
        >
          🎁 Tienes {remainingMin} min de sesión PRO hoy. ¡Aprovéchalo ahora!
        </div>
      ) : null}

      <div
        className={`flex items-center justify-between px-4 py-2 text-sm ${
          isElite
            ? "bg-gradient-to-r from-purple-500/20 to-pink-500/20 border-b border-purple-500/30"
            : isPro
            ? "bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-b border-yellow-500/30"
            : "bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-b border-blue-500/30"
        }`}
        data-testid="plan-banner"
      >
        <div className="flex items-center gap-2">
          {isElite ? (
            <>
              <Crown className="h-4 w-4 text-purple-400" />
              <span className="font-medium text-purple-100">Modo Elite – máxima potencia y prioridad</span>
            </>
          ) : isPro ? (
            <>
              <Crown className="h-4 w-4 text-yellow-400" />
              <span className="font-medium text-yellow-100">Modo Pro – voz clonada del GM Leo</span>
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 text-blue-400" />
              <span className="font-medium text-blue-100">Modo Gratis – voz genérica (ahorro activado)</span>
            </>
          )}
        </div>

        <Button
          size="sm"
          variant="outline"
          onClick={() => setDialogOpen(true)}
          className="h-7 text-xs"
          data-testid="button-change-plan"
        >
          Cambiar
        </Button>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Seleccionar Plan</DialogTitle>
            <DialogDescription>Elige entre modo Pro, Elite o Gratis</DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 pt-4">
            <Button
              variant={planMode === "free" ? "default" : "outline"}
              className="h-auto flex-col items-start p-4 gap-2"
              onClick={() => handleSwitchPlan("free")}
              data-testid="plan-switch-free"
            >
              <div className="flex items-center gap-2 w-full">
                <Zap className="h-5 w-5 text-blue-400" />
                <span className="font-semibold">Modo Gratis</span>
              </div>
              <p className="text-xs text-left opacity-80">Voz genérica optimizada (gTTS/Piper), funciones básicas</p>
            </Button>

            <Button
              variant={planMode === "pro" ? "default" : "outline"}
              className="h-auto flex-col items-start p-4 gap-2"
              onClick={() => handleSwitchPlan("pro")}
              data-testid="plan-switch-pro"
            >
              <div className="flex items-center gap-2 w-full">
                <Crown className="h-5 w-5 text-yellow-400" />
                <span className="font-semibold">Modo Pro</span>
              </div>
              <p className="text-xs text-left opacity-80">
                Voz clonada con ElevenLabs, análisis avanzado, prioridad moderada
              </p>
            </Button>

            <Button
              variant={planMode === "elite" ? "default" : "outline"}
              className="h-auto flex-col items-start p-4 gap-2"
              onClick={() => handleSwitchPlan("elite")}
              data-testid="plan-switch-elite"
            >
              <div className="flex items-center gap-2 w-full">
                <Crown className="h-5 w-5 text-purple-400" />
                <span className="font-semibold">Modo Elite</span>
              </div>
              <p className="text-xs text-left opacity-80">
                Máxima potencia: depth 24, streaming, prioridad alta, sin límites
              </p>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PlanBanner;
