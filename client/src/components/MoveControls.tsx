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
  // Ensure values are valid numbers (fix for React 14 "can't convert item to string" error)
  const safeCurrentMove = Number.isFinite(currentMove) ? Math.max(0, Math.floor(currentMove)) : 0;
  const safeTotalMoves = Number.isFinite(totalMoves) ? Math.max(0, Math.floor(totalMoves)) : 0;
  
  const isAtStart = safeCurrentMove === 0;
  const isAtEnd = safeCurrentMove >= safeTotalMoves;

  return (
    <div className="move-controls flex items-center gap-2" data-testid="container-move-controls">
      {/* Compact control buttons (≤40px height, gap ≤6px) */}
      <Button
        size="sm"
        variant="ghost"
        onClick={onFirst}
        disabled={disabled || isAtStart}
        className="btn btn-ghost btn-icon h-9 w-9 px-0"
        data-testid="button-first-move"
        title="First move"
      >
        <ChevronsLeft className="h-3 w-3" />
      </Button>
      
      <Button
        size="sm"
        variant="ghost"
        onClick={onPrevious}
        disabled={disabled || isAtStart}
        className="btn btn-ghost btn-icon h-9 w-9 px-0"
        data-testid="button-previous-move"
        title="Previous move"
      >
        <ChevronLeft className="h-3 w-3" />
      </Button>
      
      {/* Move counter (compact) */}
      <div className="text-xs font-mono px-3 text-muted-foreground" data-testid="text-move-counter">
        {safeCurrentMove}/{safeTotalMoves}
      </div>
      
      <Button
        size="sm"
        variant={isAutoPlaying ? "default" : "ghost"}
        onClick={onToggleAutoPlay}
        disabled={disabled || isAtEnd}
        className={`btn ${isAutoPlaying ? "btn-primary" : "btn-ghost"} btn-icon h-9 w-9 px-0`}
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
        variant="ghost"
        onClick={onNext}
        disabled={disabled || isAtEnd}
        className="btn btn-ghost btn-icon h-9 w-9 px-0"
        data-testid="button-next-move"
        title="Next move"
      >
        <ChevronRight className="h-3 w-3" />
      </Button>
      
      <Button
        size="sm"
        variant="ghost"
        onClick={onLast}
        disabled={disabled || isAtEnd}
        className="btn btn-ghost btn-icon h-9 w-9 px-0"
        data-testid="button-last-move"
        title="Last move"
      >
        <ChevronsRight className="h-3 w-3" />
      </Button>
    </div>
  );
}
