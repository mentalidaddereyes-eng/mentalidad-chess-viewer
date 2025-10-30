import { Button } from "@/components/ui/button";
import { ChevronsLeft, ChevronLeft, ChevronRight, ChevronsRight, Play, Pause } from "lucide-react";

interface MoveControlsProps {
  currentMove: number;
  totalMoves: number;
  isAutoPlaying: boolean;
  onFirst: () => void;
  onPrevious: () => void;
  onNext: () => void;
  onLast: () => void;
  onToggleAutoPlay: () => void;
  disabled?: boolean;
}

export function MoveControls({
  currentMove,
  totalMoves,
  isAutoPlaying,
  onFirst,
  onPrevious,
  onNext,
  onLast,
  onToggleAutoPlay,
  disabled = false,
}: MoveControlsProps) {
  const isAtStart = currentMove === 0;
  const isAtEnd = currentMove >= totalMoves;

  return (
    <div className="flex flex-col gap-4">
      {/* Move counter */}
      <div className="text-center">
        <div className="text-sm text-muted-foreground mb-1">Move</div>
        <div className="text-2xl font-bold font-mono" data-testid="text-move-counter">
          {currentMove} / {totalMoves}
        </div>
      </div>

      {/* Control buttons */}
      <div className="flex items-center justify-center gap-2">
        <Button
          size="icon"
          variant="outline"
          onClick={onFirst}
          disabled={disabled || isAtStart}
          data-testid="button-first-move"
          title="First move"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        
        <Button
          size="icon"
          variant="outline"
          onClick={onPrevious}
          disabled={disabled || isAtStart}
          data-testid="button-previous-move"
          title="Previous move"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        
        <Button
          size="icon"
          variant={isAutoPlaying ? "default" : "outline"}
          onClick={onToggleAutoPlay}
          disabled={disabled || isAtEnd}
          data-testid="button-auto-play"
          title={isAutoPlaying ? "Pause" : "Auto-play"}
        >
          {isAutoPlaying ? (
            <Pause className="h-4 w-4" />
          ) : (
            <Play className="h-4 w-4" />
          )}
        </Button>
        
        <Button
          size="icon"
          variant="outline"
          onClick={onNext}
          disabled={disabled || isAtEnd}
          data-testid="button-next-move"
          title="Next move"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        
        <Button
          size="icon"
          variant="outline"
          onClick={onLast}
          disabled={disabled || isAtEnd}
          data-testid="button-last-move"
          title="Last move"
        >
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
