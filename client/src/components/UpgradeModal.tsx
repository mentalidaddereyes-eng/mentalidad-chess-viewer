// Upgrade modal shown when trial ends or user requests upgrade
import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

export function UpgradeModal({ open, onOpenChange }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tu sesión avanzada terminó</DialogTitle>
          <DialogDescription>
            Probaste el Entrenamiento PRO:
            <ul className="mt-2 ml-4 list-disc text-sm">
              <li>Motor profundo (depth 22)</li>
              <li>Resumen táctico inmediato</li>
              <li>Voz premium</li>
            </ul>
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-3 mt-4">
          <Button
            onClick={() => {
              // redirect to upgrade page (placeholder)
              window.location.href = "/upgrade";
            }}
            className="bg-amber-500 hover:bg-amber-600"
            data-testid="button-upgrade-pro"
          >
            Activar PRO
          </Button>

          <Button
            variant="outline"
            onClick={() => {
              onOpenChange(false);
            }}
            data-testid="button-keep-free"
          >
            Seguir en FREE
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default UpgradeModal;
