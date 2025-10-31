import { Card } from "@/components/ui/card";

interface EvaluationBarProps {
  score?: number; // Centipawn score (positive = white advantage)
  mate?: number; // Mate in N moves
  className?: string;
}

export function EvaluationBar({ score, mate, className = "" }: EvaluationBarProps) {
  // Calculate bar percentage (0-100, 50 = equal position)
  const getBarPercentage = (): number => {
    if (mate !== undefined) {
      // Mate positions
      return mate > 0 ? 100 : 0;
    }
    
    if (score === undefined) {
      return 50; // Default to equal
    }

    // Convert centipawns to percentage using tanh function for smooth scaling
    // Score of ±300 cp (3 pawns) = ~95% advantage
    const normalized = Math.tanh(score / 300);
    return ((normalized + 1) / 2) * 100;
  };

  const getEvaluationText = (): string => {
    if (mate !== undefined) {
      if (mate > 0) {
        return `+M${mate}`;
      } else if (mate < 0) {
        return `-M${Math.abs(mate)}`;
      }
    }

    if (score === undefined) {
      return "0.0";
    }

    // Convert centipawns to pawns
    const pawns = score / 100;
    return pawns >= 0 ? `+${pawns.toFixed(1)}` : pawns.toFixed(1);
  };

  const getEvaluationColor = (): "white" | "black" | "equal" => {
    if (mate !== undefined) {
      return mate > 0 ? "white" : "black";
    }

    if (score === undefined || Math.abs(score) < 50) {
      return "equal";
    }

    return score > 0 ? "white" : "black";
  };

  const percentage = getBarPercentage();
  const text = getEvaluationText();
  const color = getEvaluationColor();

  return (
    <Card className={`overflow-hidden ${className}`} data-testid="evaluation-bar">
      <div className="flex items-stretch h-16">
        {/* Evaluation bar */}
        <div className="relative flex-1 bg-muted">
          {/* White advantage (bottom to top) - always light colored */}
          <div
            className="absolute bottom-0 left-0 right-0 bg-white dark:bg-zinc-100 transition-all duration-300"
            style={{ height: `${percentage}%` }}
          />
          {/* Black advantage (top to bottom) - always dark colored */}
          <div
            className="absolute top-0 left-0 right-0 bg-zinc-900 dark:bg-zinc-800 transition-all duration-300"
            style={{ height: `${100 - percentage}%` }}
          />
        </div>

        {/* Evaluation text */}
        <div className="flex items-center justify-center px-3 min-w-[4rem] border-l">
          <span
            className={`font-mono text-sm font-semibold ${
              color === "white"
                ? "text-foreground"
                : color === "black"
                ? "text-foreground"
                : "text-muted-foreground"
            }`}
            data-testid="evaluation-text"
          >
            {text}
          </span>
        </div>
      </div>
    </Card>
  );
}
