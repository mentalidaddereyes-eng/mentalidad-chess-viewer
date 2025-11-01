import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw } from "lucide-react";

export function UpdateNotification() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => {
          console.log('[sw] registered successfully');
          setRegistration(reg);

          // Check for updates
          reg.addEventListener('updatefound', () => {
            const newWorker = reg.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  console.log('[sw] new version available');
                  setUpdateAvailable(true);
                }
              });
            }
          });
        })
        .catch((err) => {
          console.error('[sw] registration failed:', err);
        });

      // Listen for controller change (new SW activated)
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[sw] controller changed, reloading page');
        window.location.reload();
      });
    }
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      // Tell the waiting SW to skip waiting
      registration.waiting.postMessage('SKIP_WAITING');
    }
  };

  if (!updateAvailable) {
    return null;
  }

  return (
    <Alert className="fixed bottom-4 right-4 w-auto max-w-md z-50 shadow-lg">
      <RefreshCw className="h-4 w-4" />
      <AlertDescription className="flex items-center gap-3">
        <span className="flex-1">New version available</span>
        <Button
          size="sm"
          onClick={handleUpdate}
          data-testid="button-update-app"
        >
          Update Now
        </Button>
      </AlertDescription>
    </Alert>
  );
}
