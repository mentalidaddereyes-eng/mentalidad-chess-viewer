import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, Volume2 } from "lucide-react";
import { MoveAnalysis } from "@shared/schema";
import { EvaluationBar } from "./EvaluationBar";

interface AnalysisPanelProps {
  analysis: MoveAnalysis | null;
  moveHistory: string[];
  currentMove: number;
  isSpeaking: boolean;
}

const evaluationConfig: Record<string, { label: string; color: string }> = {
  brilliant: { label: "Brilliant!", color: "bg-cyan-500 text-white" },
  good: { label: "Good Move", color: "bg-green-500 text-white" },
  inaccuracy: { label: "Inaccuracy", color: "bg-yellow-500 text-white" },
  mistake: { label: "Mistake", color: "bg-orange-500 text-white" },
  blunder: { label: "Blunder", color: "bg-red-500 text-white" },
};

export function AnalysisPanel({ 
  analysis, 
  moveHistory, 
  currentMove,
  isSpeaking 
}: AnalysisPanelProps) {
  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
        <CardTitle className="text-xl flex items-center gap-2">
          <Bot className="h-5 w-5" />
          AI Coach Analysis
        </CardTitle>
        {isSpeaking && (
          <div className="flex items-center gap-2 text-sm text-primary" data-testid="status-speaking">
            <Volume2 className="h-4 w-4 animate-pulse" />
            <span>Speaking...</span>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="flex-1 flex flex-col gap-4 min-h-0">
        {/* Position Evaluation Bar */}
        {analysis && (analysis.score !== undefined && analysis.score !== null || analysis.mate !== undefined && analysis.mate !== null) && (
          <EvaluationBar 
            score={analysis.score ?? undefined} 
            mate={analysis.mate ?? undefined}
          />
        )}

        {/* Current analysis */}
        {analysis ? (
          <div className="space-y-4">
            {/* Move evaluation badge */}
            {analysis.evaluation && (
              <div className="flex items-center gap-2 flex-wrap">
                <Badge 
                  className={evaluationConfig[analysis.evaluation].color}
                  data-testid={`badge-evaluation-${analysis.evaluation}`}
                >
                  {evaluationConfig[analysis.evaluation].label}
                </Badge>
                {analysis.bestMove && (
                  <span className="text-xs text-muted-foreground font-mono">
                    Best: {analysis.bestMove}
                  </span>
                )}
              </div>
            )}
            
            {/* Analysis text */}
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <p className="text-base leading-relaxed" data-testid="text-analysis">
                {analysis.analysis}
              </p>
              {analysis.comment && (
                <p className="text-sm text-muted-foreground mt-2 italic">
                  {analysis.comment}
                </p>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-muted-foreground">
            <p className="text-center" data-testid="text-no-analysis">
              {currentMove === 0 
                ? "Load a game and navigate through moves to see AI analysis" 
                : "Analyzing position..."}
            </p>
          </div>
        )}
        
        {/* Move history with confined scrolling for mobile */}
        <div className="flex-1 min-h-0 flex flex-col">
          <div className="text-sm font-semibold mb-2 text-muted-foreground">Move History</div>
          <div className="flex-1 min-h-0 max-h-[40vh] md:max-h-full overflow-hidden">
            <ScrollArea className="h-full border rounded-md bg-muted/30">
              <div className="p-4 font-mono text-sm md:text-base" data-testid="text-move-history">
                {moveHistory.length === 0 ? (
                  <p className="text-muted-foreground">No moves yet</p>
                ) : (
                  <div className="grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-1">
                    {moveHistory.map((move, index) => {
                      if (index % 2 === 0) {
                        const moveNumber = Math.floor(index / 2) + 1;
                        const whiteMove = moveHistory[index];
                        const blackMove = moveHistory[index + 1];
                        const isCurrentWhite = currentMove === index + 1;
                        const isCurrentBlack = currentMove === index + 2;
                        
                        return (
                          <div key={index} className="contents">
                            <div className="text-muted-foreground">{moveNumber}.</div>
                            <div className={isCurrentWhite ? "font-bold text-primary" : ""}>
                              {whiteMove}
                            </div>
                            <div className={isCurrentBlack ? "font-bold text-primary" : ""}>
                              {blackMove || ""}
                            </div>
                          </div>
                        );
                      }
                      return null;
                    })}
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
