import { useState, useEffect } from "react";
import { Chess } from "chess.js";
import { ChessBoard } from "@/components/ChessBoard";
import { InteractiveChessBoard } from "@/components/InteractiveChessBoard";
import { GameLoader } from "@/components/GameLoader";
import { MoveControls } from "@/components/MoveControls";
import { AnalysisPanel } from "@/components/AnalysisPanel";
import { VoiceControls } from "@/components/VoiceControls";
import { GameInfo } from "@/components/GameInfo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { Game, MoveAnalysis } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Trophy, History, Target, Settings, Volume2, VolumeX, Lightbulb, Eye, Upload } from "lucide-react";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useVoice } from "@/hooks/use-voice";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// Split multi-game PGN into individual games
// Handles both LF and CRLF line endings
function splitPgn(pgn: string): string[] {
  // Normalize to LF for consistent processing
  const normalized = pgn.replace(/\r\n/g, '\n');
  
  // Split on double newline followed by [Event tag
  const rawGames = normalized.split(/\n\n(?=\[Event)/).filter(g => g.trim());
  
  // If no split occurred, return the whole PGN as a single game
  if (rawGames.length === 0) {
    return [pgn.trim()];
  }
  
  return rawGames;
}

// Parse basic metadata from PGN
// Handles both LF and CRLF line endings
function parsePgnMeta(pgn: string): { white: string; black: string; event?: string; date?: string } {
  // Normalize line endings
  const normalized = pgn.replace(/\r\n/g, '\n');
  const lines = normalized.split("\n");
  const meta: any = {};
  
  for (const line of lines) {
    if (line.startsWith("[")) {
      const match = line.match(/\[(\w+)\s+"(.+)"\]/);
      if (match) {
        const [, key, value] = match;
        meta[key.toLowerCase()] = value;
      }
    }
  }
  
  return {
    white: meta.white || "White",
    black: meta.black || "Black",
    event: meta.event,
    date: meta.date,
  };
}

// Helper to get user settings from localStorage
function getUserSettings() {
  try {
    const savedSettings = localStorage.getItem("gm_trainer_settings");
    if (savedSettings) {
      return JSON.parse(savedSettings);
    }
  } catch (error) {
    console.error("Failed to load settings:", error);
  }
  return {
    coachingStyle: "balanced",
    difficulty: 50,
    verbosity: 50,
    language: "english"
  };
}

export default function Trainer() {
  const { toast } = useToast();
  const { voiceMode, muted, toggleMute, speak } = useVoice();
  const searchString = useSearch();
  const searchParams = new URLSearchParams(searchString);
  const gameIdParam = searchParams.get("gameId");
  
  const [chess] = useState(new Chess());
  const [game, setGame] = useState<Game | null>(null);
  const [currentMove, setCurrentMove] = useState(0);
  const [fen, setFen] = useState(STARTING_FEN);
  const [moveHistory, setMoveHistory] = useState<string[]>([]);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [currentAnalysis, setCurrentAnalysis] = useState<MoveAnalysis | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [lastQuestion, setLastQuestion] = useState<string>();
  
  // Multi-game support
  const [availablePgns, setAvailablePgns] = useState<string[]>([]);
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  
  // Analysis mode support
  const [isAnalysisMode, setIsAnalysisMode] = useState(false);
  const [customFenInput, setCustomFenInput] = useState("");
  const [analysisModeChess] = useState(new Chess());

  // Load game from history if gameId is in URL
  const { data: loadedGame } = useQuery<Game>({
    queryKey: [`/api/games/${gameIdParam}`],
    enabled: !!gameIdParam,
  });

  // Load game mutation
  const loadGameMutation = useMutation({
    mutationFn: async ({ value, type }: { value: string; type: "url" | "username" }) => {
      const res = await apiRequest("POST", "/api/games/import", { type, value });
      return await res.json();
    },
    onSuccess: (data: Game) => {
      // Check if PGN contains multiple games
      const games = splitPgn(data.pgn);
      console.log('[games] loaded:', games.length, 'game(s)');
      
      setAvailablePgns(games);
      setCurrentGameIndex(0);
      
      // Load first game
      const firstPgn = games[0];
      chess.loadPgn(firstPgn);
      const moves = chess.history();
      chess.reset();
      
      setGame(data);
      setMoveHistory(moves);
      setCurrentMove(0);
      setFen(STARTING_FEN);
      setLastMove(null);
      setCurrentAnalysis(null);
      
      toast({
        title: games.length > 1 ? `${games.length} Games Loaded` : "Game Loaded",
        description: `${data.white} vs ${data.black}`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Load Game",
        description: error.message || "Could not import the game from Lichess",
        variant: "destructive",
      });
    },
  });

  // Get move analysis mutation
  const analyzeMoveMutation = useMutation({
    mutationFn: async (moveData: { moveNumber: number; move: string; fen: string }) => {
      const settings = getUserSettings();
      const res = await apiRequest("POST", "/api/analysis/move", { 
        ...moveData, 
        settings,
        voiceMode,
        muted,
      });
      return await res.json();
    },
    onSuccess: (data: MoveAnalysis & { audioUrl?: string }) => {
      setCurrentAnalysis(data);
      
      // Use voice hook to play audio (single-channel enforcement)
      speak(data.audioUrl);
      if (data.audioUrl && !muted) {
        setIsSpeaking(true);
        setTimeout(() => setIsSpeaking(false), 3000); // Approximate speaking time
      }
    },
  });

  // Ask question mutation
  const askQuestionMutation = useMutation({
    mutationFn: async (question: string) => {
      const settings = getUserSettings();
      const res = await apiRequest("POST", "/api/voice/ask", {
        question,
        context: {
          currentMove,
          fen,
          moveHistory,
        },
        settings,
        voiceMode,
        muted,
      });
      return await res.json();
    },
    onSuccess: (data: { answer: string; audioUrl?: string }) => {
      setLastQuestion(data.answer);
      
      // Use voice hook to play audio (single-channel enforcement)
      speak(data.audioUrl);
      if (data.audioUrl && !muted) {
        setIsSpeaking(true);
        setTimeout(() => setIsSpeaking(false), 3000); // Approximate speaking time
      }
      
      toast({
        title: "Coach Responded",
        description: muted ? "Response received" : "Playing answer...",
      });
    },
    onError: () => {
      toast({
        title: "Question Failed",
        description: "Could not process your question",
        variant: "destructive",
      });
    },
  });

  // Navigate to a specific move
  const goToMove = (moveIndex: number) => {
    if (moveIndex < 0 || moveIndex > moveHistory.length) return;
    
    chess.reset();
    let lastMoveInfo = null;
    
    for (let i = 0; i < moveIndex; i++) {
      const move = chess.move(moveHistory[i]);
      if (i === moveIndex - 1 && move) {
        lastMoveInfo = { from: move.from, to: move.to };
      }
    }
    
    setCurrentMove(moveIndex);
    setFen(chess.fen());
    setLastMove(lastMoveInfo);
    
    // Get AI analysis for this move
    if (moveIndex > 0 && moveHistory[moveIndex - 1]) {
      analyzeMoveMutation.mutate({
        moveNumber: moveIndex,
        move: moveHistory[moveIndex - 1],
        fen: chess.fen(),
      });
    } else {
      setCurrentAnalysis(null);
    }
  };

  // Auto-play effect
  useEffect(() => {
    if (!isAutoPlaying || currentMove >= moveHistory.length) {
      setIsAutoPlaying(false);
      return;
    }
    
    const timer = setTimeout(() => {
      goToMove(currentMove + 1);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [isAutoPlaying, currentMove, moveHistory.length]);

  // Load game from database when fetched via URL parameter
  useEffect(() => {
    if (loadedGame && loadedGame.pgn) {
      // Check for multiple games
      const games = splitPgn(loadedGame.pgn);
      console.log('[games] loaded from history:', games.length, 'game(s)');
      
      setAvailablePgns(games);
      setCurrentGameIndex(0);
      
      // Load first game
      const firstPgn = games[0];
      chess.loadPgn(firstPgn);
      const moves = chess.history();
      chess.reset();
      
      setGame(loadedGame);
      setMoveHistory(moves);
      setCurrentMove(0);
      setFen(STARTING_FEN);
      setLastMove(null);
      setCurrentAnalysis(null);
    }
  }, [loadedGame, chess]);
  
  // Handle game selection change
  const handleGameChange = (gameIndex: string) => {
    const idx = parseInt(gameIndex);
    if (idx < 0 || idx >= availablePgns.length) return;
    
    console.log('[games] switching to game', idx + 1, 'of', availablePgns.length);
    
    setCurrentGameIndex(idx);
    const selectedPgn = availablePgns[idx];
    
    // Load the selected game
    chess.reset();
    chess.loadPgn(selectedPgn);
    const moves = chess.history();
    chess.reset();
    
    // Parse metadata from the selected PGN and update game state
    const meta = parsePgnMeta(selectedPgn);
    if (game) {
      setGame({
        ...game,
        white: meta.white,
        black: meta.black,
        event: meta.event || null,
        date: meta.date || null,
        pgn: selectedPgn,
      });
    }
    
    setMoveHistory(moves);
    setCurrentMove(0);
    setFen(STARTING_FEN);
    setLastMove(null);
    setCurrentAnalysis(null);
    setIsAutoPlaying(false);
  };

  const handleLoadGame = (value: string, type: "url" | "username") => {
    loadGameMutation.mutate({ value, type });
  };

  const handleAskQuestion = (question: string) => {
    askQuestionMutation.mutate(question);
  };

  // Toggle analysis mode
  const handleToggleAnalysisMode = () => {
    if (!isAnalysisMode) {
      // Entering analysis mode - load current position from main game
      try {
        // Reset analysisModeChess to start fresh from current position
        analysisModeChess.reset();
        
        // Replay moves up to current position
        if (currentMove > 0 && moveHistory.length > 0) {
          chess.reset();
          for (let i = 0; i < currentMove; i++) {
            chess.move(moveHistory[i]);
          }
          analysisModeChess.load(chess.fen());
        } else {
          // Start from initial position
          analysisModeChess.load(STARTING_FEN);
        }
        
        setIsAnalysisMode(true);
        setIsAutoPlaying(false); // Stop auto-play when entering analysis mode
        toast({
          title: "Analysis Mode Enabled",
          description: "You can now explore alternative moves from this position",
        });
      } catch (error) {
        toast({
          title: "Failed to Enter Analysis Mode",
          description: "Invalid position",
          variant: "destructive",
        });
      }
    } else {
      // Exiting analysis mode - restore position from main game at currentMove
      try {
        chess.reset();
        let lastMoveInfo = null;
        
        // Replay moves up to current position to restore canonical state
        for (let i = 0; i < currentMove; i++) {
          const move = chess.move(moveHistory[i]);
          if (i === currentMove - 1 && move) {
            lastMoveInfo = { from: move.from, to: move.to };
          }
        }
        
        // Restore the board to the canonical position
        setFen(chess.fen());
        setLastMove(lastMoveInfo);
        setIsAnalysisMode(false);
        setCurrentAnalysis(null); // Clear analysis from exploratory moves
        
        // Reset analysisModeChess for next time
        analysisModeChess.reset();
        
        toast({
          title: "Analysis Mode Disabled",
          description: "Returning to game view",
        });
      } catch (error) {
        toast({
          title: "Failed to Exit Analysis Mode",
          description: "Error restoring game position",
          variant: "destructive",
        });
      }
    }
  };

  // Load custom FEN position
  const handleLoadCustomFen = () => {
    if (!customFenInput.trim()) {
      toast({
        title: "FEN Required",
        description: "Please enter a valid FEN position",
        variant: "destructive",
      });
      return;
    }

    try {
      const testChess = new Chess();
      testChess.load(customFenInput.trim());
      
      // Valid FEN - load it
      analysisModeChess.load(customFenInput.trim());
      setFen(customFenInput.trim());
      setLastMove(null);
      setIsAnalysisMode(true);
      setCurrentAnalysis(null);
      
      // Request AI analysis for this position
      analyzeMoveMutation.mutate({
        moveNumber: 0,
        move: "Custom Position",
        fen: customFenInput.trim(),
      });
      
      toast({
        title: "Position Loaded",
        description: "Custom FEN position loaded for analysis",
      });
    } catch (error) {
      toast({
        title: "Invalid FEN",
        description: "Please check your FEN string and try again",
        variant: "destructive",
      });
    }
  };

  // Handle move in analysis mode
  const handleAnalysisModeMove = (move: { from: string; to: string; promotion?: string }) => {
    try {
      const result = analysisModeChess.move({
        from: move.from,
        to: move.to,
        promotion: move.promotion,
      });
      
      if (result) {
        const newFen = analysisModeChess.fen();
        setFen(newFen);
        setLastMove({ from: move.from, to: move.to });
        
        // Request AI analysis for this move
        analyzeMoveMutation.mutate({
          moveNumber: analysisModeChess.history().length,
          move: result.san,
          fen: newFen,
        });
        
        return true;
      }
      return false;
    } catch (error) {
      console.error("Invalid move in analysis mode:", error);
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Top Navigation */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Trophy className="h-7 w-7 text-primary" />
              <h1 className="text-2xl font-bold" data-testid="text-app-title">
                GM Trainer
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              {/* Voice Mute Toggle - Quick Access */}
              <Button
                variant={muted ? "outline" : "default"}
                size="icon"
                onClick={toggleMute}
                data-testid="button-toggle-mute-quick"
                title={muted ? "Unmute voice coach" : "Mute voice coach"}
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              
              <Link href="/history">
                <Button variant="outline" data-testid="button-view-history">
                  <History className="w-4 h-4 mr-2" />
                  History
                </Button>
              </Link>
              <Link href="/puzzles">
                <Button variant="outline" data-testid="button-view-puzzles">
                  <Target className="w-4 h-4 mr-2" />
                  Puzzles
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="outline" data-testid="button-view-settings">
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </Button>
              </Link>
              <GameLoader 
                onGameLoad={handleLoadGame}
                isLoading={loadGameMutation.isPending}
              />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-full">
          <div className="trainer-grid h-full">
            {/* Left Column - Chess Board */}
            <div className="flex flex-col gap-6">
              {/* Analysis Mode Banner */}
              {isAnalysisMode && (
                <div className="bg-primary/10 border border-primary/20 rounded-md p-3 flex items-center gap-2">
                  <Lightbulb className="h-5 w-5 text-primary" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-primary">Analysis Mode Active</p>
                    <p className="text-xs text-muted-foreground">Make moves to explore alternatives</p>
                  </div>
                </div>
              )}
              
              <div className="chess-board-wrapper">
                {isAnalysisMode ? (
                  <InteractiveChessBoard
                    fen={fen}
                    onMove={handleAnalysisModeMove}
                    showLegalMoves={true}
                    className="w-full h-full"
                    data-testid="interactive-chess-board"
                  />
                ) : (
                  <ChessBoard
                    fen={fen}
                    lastMove={lastMove}
                    className="w-full h-full"
                  />
                )}
              </div>
              
              <div className="flex justify-center">
                <MoveControls
                  currentMove={currentMove}
                  totalMoves={moveHistory.length}
                  isAutoPlaying={isAutoPlaying}
                  onFirst={() => goToMove(0)}
                  onPrevious={() => goToMove(currentMove - 1)}
                  onNext={() => goToMove(currentMove + 1)}
                  onLast={() => goToMove(moveHistory.length)}
                  onToggleAutoPlay={() => setIsAutoPlaying(!isAutoPlaying)}
                  disabled={!game || isAnalysisMode}
                />
              </div>
              
              {/* Analysis Mode Controls */}
              <div className="flex flex-col gap-3">
                <Button
                  variant={isAnalysisMode ? "default" : "outline"}
                  onClick={handleToggleAnalysisMode}
                  className="w-full"
                  data-testid="button-toggle-analysis-mode"
                  disabled={!game && !isAnalysisMode}
                >
                  {isAnalysisMode ? (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Exit Analysis Mode
                    </>
                  ) : (
                    <>
                      <Lightbulb className="w-4 h-4 mr-2" />
                      Enter Analysis Mode
                    </>
                  )}
                </Button>
                
                {/* Custom FEN Input */}
                <div className="flex flex-col gap-2 p-4 bg-muted/50 rounded-md">
                  <Label htmlFor="custom-fen" className="text-sm font-medium">
                    Load Custom Position (FEN)
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      id="custom-fen"
                      type="text"
                      placeholder="rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                      value={customFenInput}
                      onChange={(e) => setCustomFenInput(e.target.value)}
                      className="flex-1 font-mono text-xs"
                      data-testid="input-custom-fen"
                    />
                    <Button
                      onClick={handleLoadCustomFen}
                      variant="default"
                      size="default"
                      data-testid="button-load-fen"
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      Load
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter a FEN position to analyze with the GM coach
                  </p>
                </div>
              </div>
            </div>

            {/* Right Column - Controls & Analysis */}
            <div className="flex flex-col gap-6 min-h-0">
              <GameInfo game={game} />
              
              {/* Multi-game selector */}
              {availablePgns.length > 1 && (
                <div className="flex items-center gap-3">
                  <label htmlFor="game-select" className="text-sm font-medium whitespace-nowrap">
                    Game:
                  </label>
                  <Select
                    value={currentGameIndex.toString()}
                    onValueChange={handleGameChange}
                  >
                    <SelectTrigger
                      id="game-select"
                      className="flex-1"
                      data-testid="select-game"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availablePgns.map((pgn, idx) => {
                        const meta = parsePgnMeta(pgn);
                        const label = `${meta.white} vs ${meta.black}${meta.event ? ` · ${meta.event}` : ''}${meta.date ? ` · ${meta.date}` : ''}`;
                        return (
                          <SelectItem
                            key={idx}
                            value={idx.toString()}
                            data-testid={`select-game-${idx}`}
                          >
                            {idx + 1}. {label}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="flex-1 min-h-0">
                <AnalysisPanel
                  analysis={currentAnalysis}
                  moveHistory={moveHistory}
                  currentMove={currentMove}
                  isSpeaking={isSpeaking}
                />
              </div>
              
              <VoiceControls
                onAskQuestion={handleAskQuestion}
                isProcessing={askQuestionMutation.isPending}
                lastQuestion={lastQuestion}
                disabled={!game}
              />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
