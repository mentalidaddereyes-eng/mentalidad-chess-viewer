import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bot, MessageSquare, List, BookOpen, ExternalLink, Download } from "lucide-react";
import { MoveAnalysis } from "@shared/schema";
import { EvaluationBar } from "./EvaluationBar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";

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
  currentFen?: string;
  onExportPgn?: () => void;
}

interface Opening {
  eco: string;
  name: string;
  moves: string;
  fen: string;
  suggestions: string[];
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
  currentFen = "",
  onExportPgn,
}: RightPanelProps) {
  const [question, setQuestion] = useState("");
  const [detectedOpening, setDetectedOpening] = useState<Opening | null>(null);
  const [openings, setOpenings] = useState<Opening[]>([]);

  const handleAskQuestion = () => {
    const prompt = question.trim();
    if (prompt) {
      console.log('AskCoach:', prompt);
      if (onAskQuestion) onAskQuestion(prompt);
      setQuestion("");
    }
  };

  // v7.0: Load ECO data on mount (moved to public to avoid HTML fallback issues)
  useEffect(() => {
    fetch('/eco.min.json')
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then(data => setOpenings(data))
      .catch(err => console.error('Failed to load ECO data:', err));
  }, []);

  // v7.0: Detect opening from current FEN
  useEffect(() => {
    if (!currentFen || openings.length === 0) return;
    
    // Normalize FEN (keep only position part)
    const normalizedFen = currentFen.split(" ").slice(0, 4).join(" ");
    
    // Find matching opening in eco.min.json
    const match = openings.find(opening => {
      const openingFen = opening.fen.split(" ").slice(0, 4).join(" ");
      return openingFen === normalizedFen;
    });
    
    setDetectedOpening(match || null);
  }, [currentFen, openings]);

  const displayMoves = isAnalysisMode ? exploratoryMoves : moveHistory;

  return (
    <Card className="panel right-panel-confined h-full flex flex-col p-2">
      <Tabs defaultValue="analysis" className="flex-1 flex flex-col min-h-0">
<TabsList className="mx-2 mt-2 grid w-[calc(100%-1rem)] grid-cols-7">
          <TabsTrigger value="analysis" className="text-xs" data-testid="tab-analysis">
            <Bot className="w-3 h-3 mr-1" />
<span className="hidden sm:inline">Análisis</span>
          </TabsTrigger>
          <TabsTrigger value="moves" className="text-xs" data-testid="tab-moves">
            <List className="w-3 h-3 mr-1" />
<span className="hidden sm:inline">Movimientos</span>
          </TabsTrigger>
          <TabsTrigger value="games" className="text-xs" data-testid="tab-games">
            <List className="w-3 h-3 mr-1" />
            <span className="hidden sm:inline">Games</span>
          </TabsTrigger>
<TabsTrigger value="openings" className="text-xs" data-testid="tab-openings">
            <BookOpen className="w-3 h-3 mr-1" />
            <span className="hidden sm:inline">Aperturas</span>
          </TabsTrigger>
          <TabsTrigger value="dvoretsky" className="text-xs" data-testid="tab-dvoretsky">
            <BookOpen className="w-3 h-3 mr-1" />
            <span className="hidden sm:inline">GM Dvoretsky</span>
          </TabsTrigger>
          <TabsTrigger value="fen" className="text-xs" data-testid="tab-fen">
            <BookOpen className="w-3 h-3 mr-1" />
            <span className="hidden sm:inline">Ejercicios FEN</span>
          </TabsTrigger>
          <TabsTrigger value="coach" className="text-xs" data-testid="tab-coach">
            <MessageSquare className="w-3 h-3 mr-1" />
            <span className="hidden sm:inline">Coach</span>
          </TabsTrigger>
        </TabsList>

        {/* Analysis Tab */}
        <TabsContent value="analysis" className="flex-1 mt-0 p-2 min-h-0 flex flex-col gap-2">
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
        <TabsContent value="moves" className="flex-1 mt-0 p-2 min-h-0 flex flex-col gap-2">
          <ScrollArea className="confined-scroll flex-1">
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
          {onExportPgn && displayMoves.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={onExportPgn}
              className="w-full"
              data-testid="export-pgn"
            >
              <Download className="w-3 h-3 mr-2" />
              Exportar PGN
            </Button>
          )}
        </TabsContent>

        {/* Games Tab - v7.0: Compact with fixed height */}
        <TabsContent value="games" className="flex-1 mt-0 p-2 min-h-0">
          <div className="max-h-[260px] overflow-y-auto" data-testid="games-pane-compact">
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
                      className="p-2 border rounded-md hover-elevate active-elevate-2 cursor-pointer"
                    >
                      <div className="text-xs font-semibold truncate">{game.white} - {game.black}</div>
                      <div className="flex gap-2 text-xs text-muted-foreground">
                        {game.result && <span>{game.result}</span>}
                        {game.eco && <span>({game.eco})</span>}
                        {game.date && <span>{game.date}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        {/* Openings Tab - v7.0 */}
        <TabsContent value="openings" className="flex-1 mt-0 p-2 min-h-0">
          <ScrollArea className="confined-scroll h-full">
            <div className="pr-4">
              {detectedOpening ? (
                <div className="space-y-3" data-testid="opening-hit">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant="outline" className="font-mono text-xs">
                        {detectedOpening.eco}
                      </Badge>
                      <h3 className="font-semibold text-sm">{detectedOpening.name}</h3>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono">
                      {detectedOpening.moves}
                    </p>
                  </div>

                  {detectedOpening.suggestions && detectedOpening.suggestions.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold mb-2">Continuaciones populares:</h4>
                      <div className="flex flex-wrap gap-2" data-testid="opening-next">
                        {detectedOpening.suggestions.map((move, index) => (
                          <Badge key={index} variant="secondary" className="text-xs font-mono">
                            {move}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => {
                      const query = encodeURIComponent(detectedOpening.name);
                      window.open(`https://lichess.org/opening?q=${query}`, '_blank');
                    }}
                  >
                    <ExternalLink className="w-3 h-3 mr-2" />
                    Ver en Lichess
                  </Button>
                </div>
              ) : (
                <div className="text-xs text-muted-foreground">
                  {currentFen ? (
                    <p>Posición no reconocida. Continúa jugando para detectar una apertura conocida.</p>
                  ) : (
                    <p>Comienza una partida para detectar la apertura automáticamente.</p>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </TabsContent>

        {/* GM Dvoretsky Tab */}
        <TabsContent value="dvoretsky" className="flex-1 mt-0 p-2 min-h-0">
          <ScrollArea className="confined-scroll h-full">
            <div className="pr-4 text-xs text-muted-foreground">
              <p>Principios y patrones de entrenamiento (placeholder).</p>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Ejercicios FEN Tab */}
        <TabsContent value="fen" className="flex-1 mt-0 p-2 min-h-0">
          <ScrollArea className="confined-scroll h-full">
            <div className="pr-4 text-xs text-muted-foreground">
              <p>Pega o genera ejercicios FEN para practicar (placeholder).</p>
            </div>
          </ScrollArea>
        </TabsContent>

        {/* Coach Tab */}
        <TabsContent value="coach" className="flex-1 mt-0 p-2 min-h-0 flex flex-col gap-2">
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
