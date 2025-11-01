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
    <div className="flex items-center justify-center gap-1 mt-1 mb-2" data-testid="container-move-controls">
      {/* Compact control buttons (≤40px height, gap ≤6px) */}
      <Button
        size="sm"
        variant="outline"
        onClick={onFirst}
        disabled={disabled || isAtStart}
        className="h-9 px-2"
        data-testid="button-first-move"
        title="First move"
      >
        <ChevronsLeft className="h-3 w-3" />
      </Button>
      
      <Button
        size="sm"
        variant="outline"
        onClick={onPrevious}
        disabled={disabled || isAtStart}
        className="h-9 px-2"
        data-testid="button-previous-move"
        title="Previous move"
      >
        <ChevronLeft className="h-3 w-3" />
      </Button>
      
      {/* Move counter (compact) */}
      <div className="text-xs font-mono px-3 text-muted-foreground" data-testid="text-move-counter">
        {currentMove}/{totalMoves}
      </div>
      
      <Button
        size="sm"
        variant={isAutoPlaying ? "default" : "outline"}
        onClick={onToggleAutoPlay}
        disabled={disabled || isAtEnd}
        className="h-9 px-2"
        data-testid="button-auto-play"
        title={isAutoPlaying ? "Pause" : "Auto-play"}
      >
        {isAutoPlaying ? (
          <Pause className="h-3 w-3" />
        ) : (
          <Play className="h-3 w-3" />
        )}
      </Button>
      
      <Button
        size="sm"
        variant="outline"
        onClick={onNext}
        disabled={disabled || isAtEnd}
        className="h-9 px-2"
        data-testid="button-next-move"
        title="Next move"
      >
        <ChevronRight className="h-3 w-3" />
      </Button>
      
      <Button
        size="sm"
        variant="outline"
        onClick={onLast}
        disabled={disabled || isAtEnd}
        className="h-9 px-2"
        data-testid="button-last-move"
        title="Last move"
      >
        <ChevronsRight className="h-3 w-3" />
      </Button>
    </div>
  );
}
