// Cost Saver Pack v6.0: Plan banner with Pro/Free switcher

import { useState, useEffect } from "react";
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

export function PlanBanner() {
  const [planMode, setPlanModeState] = useState<PlanMode>('free');
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    const currentPlan = getPlanMode();
    setPlanModeState(currentPlan);
  }, []);

  const handleSwitchPlan = (newPlan: PlanMode) => {
    setPlanMode(newPlan);
    setPlanModeState(newPlan);
    setDialogOpen(false);
    
    // Reload to apply voice changes
    window.location.reload();
  };

  const isPro = planMode === 'pro';

  return (
    <>
      <div
        className={`flex items-center justify-between px-4 py-2 text-sm ${
          isPro
            ? 'bg-gradient-to-r from-yellow-500/20 to-amber-500/20 border-b border-yellow-500/30'
            : 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 border-b border-blue-500/30'
        }`}
        data-testid="plan-banner"
      >
        <div className="flex items-center gap-2">
          {isPro ? (
            <>
              <Crown className="h-4 w-4 text-yellow-400" />
              <span className="font-medium text-yellow-100">
                Modo Pro – voz clonada del GM Leo
              </span>
            </>
          ) : (
            <>
              <Zap className="h-4 w-4 text-blue-400" />
              <span className="font-medium text-blue-100">
                Modo Gratis – voz genérica (ahorro activado)
              </span>
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
            <DialogDescription>
              Elige entre modo Pro (voz clonada premium) o Gratis (voz genérica)
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-3 pt-4">
            <Button
              variant={isPro ? "default" : "outline"}
              className="h-auto flex-col items-start p-4 gap-2"
              onClick={() => handleSwitchPlan('pro')}
              data-testid="plan-switch-pro"
            >
              <div className="flex items-center gap-2 w-full">
                <Crown className="h-5 w-5 text-yellow-400" />
                <span className="font-semibold">Modo Pro</span>
              </div>
              <p className="text-xs text-left opacity-80">
                Voz clonada del GM Leo con ElevenLabs, análisis avanzado, puzzles ilimitados
              </p>
            </Button>

            <Button
              variant={!isPro ? "default" : "outline"}
              className="h-auto flex-col items-start p-4 gap-2"
              onClick={() => handleSwitchPlan('free')}
              data-testid="plan-switch-free"
            >
              <div className="flex items-center gap-2 w-full">
                <Zap className="h-5 w-5 text-blue-400" />
                <span className="font-semibold">Modo Gratis</span>
              </div>
              <p className="text-xs text-left opacity-80">
                Voz genérica optimizada (gTTS/Piper), funciones básicas, ahorro de costos
              </p>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
