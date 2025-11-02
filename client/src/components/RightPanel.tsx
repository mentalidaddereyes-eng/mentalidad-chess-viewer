import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bot, MessageSquare, List } from "lucide-react";
import { MoveAnalysis } from "@shared/schema";
import { EvaluationBar } from "./EvaluationBar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";

interface RightPanelProps {
  analysis: MoveAnalysis | null;
  moveHistory: string[];
  currentMove: number;
  isSpeaking: boolean;
  exploratoryMoves?: string[];
  isAnalysisMode?: boolean;
  onAskQuestion?: (question: string) => void;
  lastAnswer?: string;
  games?: Array<{pgn: string; white: string; black: string; result: string; eco: string; date: string}>;
  onSelectGame?: (index: number) => void;
}

const evaluationConfig: Record<string, { label: string; color: string }> = {
  brilliant: { label: "Brilliant!", color: "bg-cyan-500 text-white" },
  good: { label: "Good Move", color: "bg-green-500 text-white" },
  inaccuracy: { label: "Inaccuracy", color: "bg-yellow-500 text-white" },
  mistake: { label: "Mistake", color: "bg-orange-500 text-white" },
  blunder: { label: "Blunder", color: "bg-red-500 text-white" },
};

export function RightPanel({
  analysis,
  moveHistory,
  currentMove,
  isSpeaking,
  exploratoryMoves = [],
  isAnalysisMode = false,
  onAskQuestion,
  lastAnswer,
  games = [],
  onSelectGame,
}: RightPanelProps) {
  const [question, setQuestion] = useState("");

  const handleAskQuestion = () => {
    if (question.trim() && onAskQuestion) {
      onAskQuestion(question.trim());
      setQuestion("");
    }
  };

  const displayMoves = isAnalysisMode ? exploratoryMoves : moveHistory;

  return (
    <Card className="h-full flex flex-col">
      <Tabs defaultValue="analysis" className="flex-1 flex flex-col min-h-0">
        <TabsList className="mx-3 mt-3 grid w-[calc(100%-1.5rem)] grid-cols-4">
          <TabsTrigger value="analysis" className="text-xs" data-testid="tab-analysis">
            <Bot className="w-3 h-3 mr-1" />
            Analysis
          </TabsTrigger>
          <TabsTrigger value="moves" className="text-xs" data-testid="tab-moves">
            <List className="w-3 h-3 mr-1" />
            Moves
          </TabsTrigger>
          <TabsTrigger value="games" className="text-xs" data-testid="tab-games">
            <List className="w-3 h-3 mr-1" />
            Games
          </TabsTrigger>
          <TabsTrigger value="coach" className="text-xs" data-testid="tab-coach">
            <MessageSquare className="w-3 h-3 mr-1" />
            Coach
          </TabsTrigger>
        </TabsList>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="flex-1 mt-0 p-3 min-h-0 flex flex-col gap-3">
          {analysis && (
            <>
              {/* Evaluation Bar */}
              {(analysis.score !== undefined && analysis.score !== null || 
                analysis.mate !== undefined && analysis.mate !== null) && (
                <EvaluationBar 
                  score={analysis.score ?? undefined} 
                  mate={analysis.mate ?? undefined}
                />
              )}

              {/* Evaluation Badge */}
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
            </>
          )}

          {/* Analysis Text */}
          <ScrollArea className="confined-scroll flex-1">
            <div className="pr-4">
              {analysis ? (
                <div className="space-y-3">
                  <p className="text-sm leading-relaxed" data-testid="text-analysis">
                    {analysis.analysis}
                  </p>
                  {analysis.comment && (
                    <p className="text-xs text-muted-foreground italic">
                      {analysis.comment}
                    </p>
                  )}
                  {isSpeaking && (
                    <div className="flex items-center gap-2 text-xs text-primary animate-pulse">
                      <Bot className="h-3 w-3" />
                      <span>Speaking...</span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-32 text-muted-foreground">
                  <p className="text-center text-sm" data-testid="text-no-analysis">
                    {currentMove === 0 
                      ? "Make moves or load a game to see AI analysis" 
                      : "Analyzing position..."}
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Moves Tab */}
        <TabsContent value="moves" className="flex-1 mt-0 p-3 min-h-0">
          <ScrollArea className="confined-scroll h-full">
            <div className="pr-4 font-mono text-sm" data-testid="text-move-history">
              {displayMoves.length === 0 ? (
                <p className="text-muted-foreground text-xs">No moves yet</p>
              ) : (
                <div className="grid grid-cols-[auto_1fr_1fr] gap-x-4 gap-y-1">
                  {displayMoves.map((move, index) => {
                    if (index % 2 === 0) {
                      const moveNumber = Math.floor(index / 2) + 1;
                      const whiteMove = displayMoves[index];
                      const blackMove = displayMoves[index + 1];
                      const isCurrentWhite = currentMove === index + 1;
                      const isCurrentBlack = currentMove === index + 2;
                      
                      return (
                        <div key={index} className="contents">
                          <div className="text-muted-foreground text-xs">{moveNumber}.</div>
                          <div className={`text-xs ${isCurrentWhite ? "font-bold text-primary" : ""}`}>
                            {whiteMove}
                          </div>
                          <div className={`text-xs ${isCurrentBlack ? "font-bold text-primary" : ""}`}>
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
        </TabsContent>

        {/* Games Tab - HOTFIX v6.2 */}
        <TabsContent value="games" className="flex-1 mt-0 p-3 min-h-0">
          <ScrollArea className="confined-scroll h-full" data-testid="games-panel">
            <div className="pr-4">
              {games.length === 0 ? (
                <p className="text-muted-foreground text-xs">No games imported. Use Import to load .PGN files.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {games.map((game, index) => (
                    <div
                      key={index}
                      data-testid={`game-row-${index}`}
                      onClick={() => onSelectGame?.(index)}
                      className="p-2 border rounded-md hover-elevate active-elevate-2 cursor-pointer text-xs"
                    >
                      <div className="font-semibold">{game.white} - {game.black}</div>
                      <div className="flex gap-2 text-muted-foreground mt-1">
                        {game.result && <span>{game.result}</span>}
                        {game.eco && <span>({game.eco})</span>}
                        {game.date && <span>{game.date}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Coach Tab */}
        <TabsContent value="coach" className="flex-1 mt-0 p-3 min-h-0 flex flex-col gap-3">
          <div className="flex flex-col gap-2">
            <Textarea
              placeholder="Ask your chess coach a question..."
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              className="min-h-[80px] text-sm resize-none"
              data-testid="input-coach-question"
              onKeyDown={(e) => {
                if (e.key === "Enter" && e.ctrlKey) {
                  handleAskQuestion();
                }
              }}
            />
            <Button
              onClick={handleAskQuestion}
              disabled={!question.trim()}
              size="sm"
              className="h-8"
              data-testid="button-ask-coach"
            >
              <MessageSquare className="w-3 h-3 mr-2" />
              Ask Coach
            </Button>
          </div>

          {lastAnswer && (
            <ScrollArea className="confined-scroll flex-1 border rounded-md bg-muted/20 p-3">
              <div className="pr-3">
                <p className="text-sm leading-relaxed" data-testid="text-coach-answer">
                  {lastAnswer}
                </p>
              </div>
            </ScrollArea>
          )}
        </TabsContent>
      </Tabs>
    </Card>
  );
}
