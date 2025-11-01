import { Button } from "@/components/ui/button";
import { Upload, ChevronLeft, ChevronRight, FlipVertical, Mic } from "lucide-react";

interface MobileDockProps {
  onLoad: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onFlip: () => void;
  onVoice: () => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
}

export function MobileDock({
  onLoad,
  onPrevious,
  onNext,
  onFlip,
  onVoice,
  canGoPrevious = true,
  canGoNext = true,
}: MobileDockProps) {
  return (
    <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t z-50">
      <div className="flex items-center justify-around p-2 gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={onLoad}
          className="h-11 w-11"
          data-testid="mobile-dock-load"
          title="Load game"
        >
          <Upload className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onPrevious}
          disabled={!canGoPrevious}
          className="h-11 w-11"
          data-testid="mobile-dock-previous"
          title="Previous move"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onNext}
          disabled={!canGoNext}
          className="h-11 w-11"
          data-testid="mobile-dock-next"
          title="Next move"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onFlip}
          className="h-11 w-11"
          data-testid="mobile-dock-flip"
          title="Flip board"
        >
          <FlipVertical className="h-5 w-5" />
        </Button>
        
        <Button
          variant="ghost"
          size="icon"
          onClick={onVoice}
          className="h-11 w-11"
          data-testid="mobile-dock-voice"
          title="Ask coach"
        >
          <Mic className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
