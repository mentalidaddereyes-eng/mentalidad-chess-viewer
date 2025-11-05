// Trial Banner: Shows trial availability for FREE users
// feat(subscriptions)

import { useState, useEffect } from "react";
import { Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface TrialInfo {
  eligible: boolean;
  usedToday: boolean;
  remainingMs: number;
  startTime?: number;
}

interface PlanResponse {
  plan: string;
  trial: TrialInfo;
  config: any;
}

export function TrialBanner() {
  const { data: planData } = useQuery<PlanResponse>({
    queryKey: ['/api/plan'],
    queryFn: () => apiRequest('GET', '/api/plan').then(res => res.json()),
    refetchInterval: 30000, // Check every 30 seconds
  });

  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (planData) {
      const { plan, trial } = planData;
      // Show banner if FREE plan with eligible trial
      const shouldShow = plan === 'free' && trial.eligible && !trial.usedToday;
      setShowBanner(shouldShow);
    }
  }, [planData]);

  if (!showBanner || !planData) return null;

  const { trial } = planData;
  const remainingMin = Math.ceil(trial.remainingMs / 60000);

  return (
    <div
      className="flex items-center justify-between px-4 py-2 text-sm bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-b border-green-500/30"
      data-testid="trial-banner"
    >
      <div className="flex items-center gap-2">
        <Gift className="h-4 w-4 text-green-400" />
        <span className="font-medium text-green-100">
          🎁 Tienes {remainingMin} min de sesión PRO hoy. ¡Aprovéchalo ahora!
        </span>
      </div>
    </div>
  );
}

