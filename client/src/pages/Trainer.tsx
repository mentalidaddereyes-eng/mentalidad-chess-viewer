import { useState, useEffect } from "react";
import { Chess } from "chess.js";
import { ChessBoard } from "@/components/ChessBoard";
import { InteractiveChessBoard } from "@/components/InteractiveChessBoard";
import { MoveControls } from "@/components/MoveControls";
import { useToast } from "@/hooks/use-toast";
import { Game, MoveAnalysis } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useSearch, useLocation } from "wouter";
import { useVoice } from "@/hooks/use-voice";
import { ChessComHeader } from "@/components/ChessComHeader";
import { ActionPanel } from "@/components/ActionPanel";
import { RightPanel } from "@/components/RightPanel";
import { MobileDock } from "@/components/MobileDock";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2 } from "lucide-react";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

// Split multi-game PGN into individual games
function splitPgn(pgn: string): string[] {
  const normalized = pgn.replace(/\r\n/g, '\n');
  const rawGames = normalized.split(/\n\n(?=\[Event)/).filter(g => g.trim());
  if (rawGames.length === 0) {
    return [pgn.trim()];
  }
  return rawGames;
}

// Parse basic metadata from PGN (HOTFIX v6.2: added result, eco)
function parsePgnMeta(pgn: string): { white: string; black: string; event?: string; date?: string; result?: string; eco?: string } {
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
    result: meta.result,
    eco: meta.eco,
  };
}

// Helper to get user settings from localStorage - Fix Pack v5.1: Default to ES
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
    language: "spanish" // Fix Pack v5.1: Default to Spanish
  };
}

export default function Trainer() {
  const { toast } = useToast();
  const { voiceMode, muted, toggleMute, speak, selectVoice } = useVoice();
  const [, setLocation] = useLocation();
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
  const [lastAnswer, setLastAnswer] = useState<string>();
  
  // Multi-game support
  const [availablePgns, setAvailablePgns] = useState<string[]>([]);
  const [currentGameIndex, setCurrentGameIndex] = useState(0);
  
  // Analysis mode support - DEFAULT TO TRUE for free analysis mode
  const [isAnalysisMode, setIsAnalysisMode] = useState(true);
  const [analysisModeChess] = useState(new Chess());
  const [exploratoryMoves, setExploratoryMoves] = useState<string[]>([]);
  
  // Play vs Coach mode
  const [isPlayVsCoach, setIsPlayVsCoach] = useState(false);
  const [playerColor, setPlayerColor] = useState<"white" | "black">("white");
  const [boardOrientation, setBoardOrientation] = useState<"white" | "black">("white");
  const [isEngineThinking, setIsEngineThinking] = useState(false);
  
  // Dialogs - Hotfix v5.1.1: Single Import dialog
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importInput, setImportInput] = useState("");
  
  // HOTFIX v6.2: Multi-game import from file
  const [importedGames, setImportedGames] = useState<Array<{pgn: string; white: string; black: string; result: string; eco: string; date: string}>>([]);

  console.log('[mode] free-analysis ready | training=ON | interactive=drag+tap');

  // Load game from history if gameId is in URL
  const { data: loadedGame } = useQuery<Game>({
    queryKey: [`/api/games/${gameIdParam}`],
    enabled: !!gameIdParam,
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
      console.log('[coach] onUserMove fen=', fen.split(' ')[0], 'eval=', data.score || data.mate);
      
      speak(data.audioUrl);
      if (data.audioUrl && !muted) {
        setIsSpeaking(true);
        setTimeout(() => setIsSpeaking(false), 3000);
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
      setLastAnswer(data.answer);
      
      speak(data.audioUrl);
      if (data.audioUrl && !muted) {
        setIsSpeaking(true);
        setTimeout(() => setIsSpeaking(false), 3000);
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

  // Navigate to a specific move (for PGN navigation)
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
      const games = splitPgn(loadedGame.pgn);
      console.log('[games] loaded:', games.length);
      
      setAvailablePgns(games);
      setCurrentGameIndex(0);
      
      const firstPgn = games[0];
      chess.loadPgn(firstPgn);
      const moves = chess.history();
      const finalFen = chess.fen();
      const lastMoveObj = chess.history({ verbose: true }).slice(-1)[0];
      chess.reset();
      
      setGame(loadedGame);
      setMoveHistory(moves);
      setCurrentMove(moves.length);
      setFen(finalFen);
      setLastMove(lastMoveObj ? { from: lastMoveObj.from, to: lastMoveObj.to } : null);
      setCurrentAnalysis(null);
      setIsAnalysisMode(false); // Switch to game view mode
    }
  }, [loadedGame, chess]);

  // Handle move in analysis/play mode
  const handleMove = (move: { from: string; to: string; promotion?: string }) => {
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
        
        setExploratoryMoves(prev => [...prev, result.san]);
        
        // Request AI analysis for this move
        analyzeMoveMutation.mutate({
          moveNumber: analysisModeChess.history().length,
          move: result.san,
          fen: newFen,
        });
        
        // If playing vs coach, trigger engine move
        if (isPlayVsCoach) {
          const isPlayerTurn = (playerColor === "white" && analysisModeChess.turn() === "w") ||
                               (playerColor === "black" && analysisModeChess.turn() === "b");
          
          if (!isPlayerTurn && !analysisModeChess.isGameOver()) {
            setTimeout(() => makeEngineMove(), 800);
          }
        }
        
        return true;
      }
      return false;
    } catch (error) {
      console.error("Invalid move:", error);
      return false;
    }
  };

  // Engine makes a move (Stockfish best move)
  const makeEngineMove = async () => {
    if (!isPlayVsCoach || isEngineThinking) return;
    
    setIsEngineThinking(true);
    console.log('[coach] engineMove thinking...');
    
    try {
      // Request Stockfish analysis to get best move
      const response = await fetch('/api/stockfish/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fen: analysisModeChess.fen(),
          depth: 15,
        }),
      });
      
      const data = await response.json();
      
      if (data.bestMove) {
        // Parse best move (format: "e2e4" or "e7e8q")
        const from = data.bestMove.substring(0, 2);
        const to = data.bestMove.substring(2, 4);
        const promotion = data.bestMove.length > 4 ? data.bestMove[4] : undefined;
        
        const result = analysisModeChess.move({ from, to, promotion });
        
        if (result) {
          const newFen = analysisModeChess.fen();
          setFen(newFen);
          setLastMove({ from, to });
          setExploratoryMoves(prev => [...prev, result.san]);
          
          console.log('[coach] engineMove:', result.san);
          
          // Get AI explanation for engine move
          const settings = getUserSettings();
          const explainRes = await apiRequest("POST", "/api/analysis/move", {
            moveNumber: analysisModeChess.history().length,
            move: result.san,
            fen: newFen,
            settings: {
              ...settings,
              // Adapt tone based on voice mode
              coachingStyle: voiceMode === "kids" ? "balanced" : settings.coachingStyle,
              verbosity: voiceMode === "kids" ? 30 : settings.verbosity, // Shorter for kids
            },
            voiceMode,
            muted,
          });
          
          const explainData = await explainRes.json();
          setCurrentAnalysis(explainData);
          
          speak(explainData.audioUrl);
          if (explainData.audioUrl && !muted) {
            setIsSpeaking(true);
            setTimeout(() => setIsSpeaking(false), 3000);
          }
        }
      }
    } catch (error) {
      console.error('[coach] engineMove error:', error);
      toast({
        title: "Engine Error",
        description: "Failed to get coach move",
        variant: "destructive",
      });
    } finally {
      setIsEngineThinking(false);
    }
  };

  // Handle game load from various sources
  const handleLoadGame = (value: string, type: "url" | "username") => {
    // Implementation would go here - simplified for now
    toast({
      title: "Load from Lichess",
      description: "Use the Load PGN dialog for now",
    });
  };

  // Handle voice mode change
  const handleVoiceModeChange = (mode: "pro" | "kids") => {
    console.log('[voice] mode=', mode, '| muted=', muted);
    selectVoice(mode);
  };

  // New game / Reset
  const handleNewGame = () => {
    analysisModeChess.reset();
    setFen(STARTING_FEN);
    setLastMove(null);
    setExploratoryMoves([]);
    setCurrentAnalysis(null);
    setIsAnalysisMode(true);
    setIsPlayVsCoach(false);
    setIsAutoPlaying(false);
    setGame(null);
    setMoveHistory([]);
    setCurrentMove(0);
    
    toast({
      title: "New Game",
      description: "Board reset for free analysis",
    });
  };

  // Hotfix v5.1.1: Single Import with auto-detection PGN/FEN
  const handleImport = () => {
    const input = importInput.trim();
    
    if (!input) {
      toast({
        title: "Input required",
        description: "Please paste a valid PGN or FEN",
        variant: "destructive",
      });
      return;
    }

    // FEN detection: starts with piece positions (e.g., "rnbqkbnr/...")
    const isFen = /^([rnbqkpRNBQKP1-8]+\/){7}[rnbqkpRNBQKP1-8]+/.test(input);
    
    // PGN detection: contains [Event or move notation like "1. e4"
    const isPgn = input.includes('[Event') || /\d+\.\s*[a-h1-8]/i.test(input);

    if (isFen) {
      // Load as FEN
      try {
        const testChess = new Chess();
        testChess.load(input);
        
        analysisModeChess.reset();
        analysisModeChess.load(input);
        setFen(input);
        setLastMove(null);
        setIsAnalysisMode(true);
        setCurrentAnalysis(null);
        setExploratoryMoves([]);
        setImportDialogOpen(false);
        setImportInput("");
        
        // Request AI analysis for this position
        analyzeMoveMutation.mutate({
          moveNumber: 0,
          move: "Custom Position",
          fen: input,
        });
        
        toast({
          title: "Position Loaded (FEN)",
          description: "Custom FEN position loaded for analysis",
        });
      } catch (error) {
        toast({
          title: "Invalid FEN",
          description: "Please check your FEN string and try again",
          variant: "destructive",
        });
      }
    } else if (isPgn) {
      // Load as PGN
      try {
        const games = splitPgn(input);
        console.log('[games] loaded:', games.length);
        
        setAvailablePgns(games);
        setCurrentGameIndex(0);
        
        // HOTFIX v6.2: Parse metadata for all games
        const gamesData = games.map((pgn) => {
          const meta = parsePgnMeta(pgn);
          return {
            pgn,
            white: meta.white || "Unknown",
            black: meta.black || "Unknown",
            result: meta.result || "*",
            eco: meta.eco || "",
            date: meta.date || "",
          };
        });
        setImportedGames(gamesData);
        
        const firstPgn = games[0];
        chess.reset();
        chess.loadPgn(firstPgn);
        const moves = chess.history();
        const finalFen = chess.fen();
        const lastMoveObj = chess.history({ verbose: true}).slice(-1)[0];
        
        const meta = parsePgnMeta(firstPgn);
        
        setGame({
          id: 0,
          white: meta.white,
          black: meta.black,
          result: null,
          event: meta.event || null,
          site: null,
          opening: null,
          date: meta.date || null,
          pgn: input,
          createdAt: new Date(),
        });
        setMoveHistory(moves);
        setCurrentMove(moves.length); // Jump to last move
        setFen(finalFen);
        setLastMove(lastMoveObj ? { from: lastMoveObj.from, to: lastMoveObj.to } : null);
        setCurrentAnalysis(null);
        setIsAnalysisMode(false);
        setImportDialogOpen(false);
        setImportInput("");
        
        toast({
          title: games.length > 1 ? `${games.length} Games Loaded` : "Game Loaded (PGN)",
          description: `${meta.white} vs ${meta.black}`,
        });
      } catch (error) {
        toast({
          title: "Invalid PGN",
          description: "Please check your PGN and try again",
          variant: "destructive",
        });
      }
    } else {
      // Neither FEN nor PGN
      toast({
        title: "Invalid Input",
        description: "Please paste a valid PGN or FEN",
        variant: "destructive",
      });
    }
  };

  // Toggle Play vs Coach
  const handleTogglePlayVsCoach = () => {
    if (!isPlayVsCoach) {
      // Entering Play vs Coach mode
      console.log('[mode] play-vs-coach | side=', playerColor === "white" ? "w" : "b");
      
      analysisModeChess.reset();
      setFen(STARTING_FEN);
      setLastMove(null);
      setExploratoryMoves([]);
      setCurrentAnalysis(null);
      setIsAnalysisMode(true);
      setIsPlayVsCoach(true);
      
      // Auto-flip board to player's color
      setBoardOrientation(playerColor);
      
      // If player is black, engine makes first move
      if (playerColor === "black") {
        setTimeout(() => makeEngineMove(), 1000);
      }
      
      toast({
        title: "Play vs Coach",
        description: `You play ${playerColor}. Good luck!`,
      });
    } else {
      // Exiting Play vs Coach mode
      setIsPlayVsCoach(false);
      toast({
        title: "Free Analysis Mode",
        description: "Explore moves freely",
      });
    }
  };

  return (
    <div className="chesscom-layout">
      <ChessComHeader
        voiceMode={voiceMode}
        muted={muted}
        onToggleMute={toggleMute}
        onVoiceModeChange={handleVoiceModeChange}
        onGameLoad={handleLoadGame}
        isLoading={false}
      />

      <div className="chesscom-grid">
        {/* Left Panel - Actions */}
        <div className="hidden lg:block overflow-y-auto">
          <ActionPanel
            isPlayVsCoach={isPlayVsCoach}
            playerColor={playerColor}
            isAutoPlaying={isAutoPlaying}
            canUndo={exploratoryMoves.length > 0}
            canRedo={false}
            onNewGame={handleNewGame}
            onImport={() => setImportDialogOpen(true)}
            onFlipBoard={() => {}}
            onUndo={() => {
              if (exploratoryMoves.length > 0) {
                analysisModeChess.undo();
                setExploratoryMoves(prev => prev.slice(0, -1));
                setFen(analysisModeChess.fen());
              }
            }}
            onRedo={() => {}}
            onToggleAutoPlay={() => setIsAutoPlaying(!isAutoPlaying)}
            onExportPgn={() => {}}
            onSettings={() => setLocation("/settings")}
            onTogglePlayVsCoach={handleTogglePlayVsCoach}
            onPlayerColorChange={(color) => {
              setPlayerColor(color);
              // Update board orientation when player color changes
              if (isPlayVsCoach) {
                setBoardOrientation(color);
                
                // If changing to Black and game hasn't started, engine should make first move
                if (color === "black" && exploratoryMoves.length === 0) {
                  setTimeout(() => makeEngineMove(), 1000);
                }
              }
            }}
          />
        </div>

        {/* Center Panel - Chess Board */}
        <div className="flex flex-col gap-2 overflow-hidden">
          <div className="chess-board-wrapper">
            <InteractiveChessBoard
              fen={fen}
              orientation={boardOrientation}
              onMove={handleMove}
              showLegalMoves={true}
              disabled={isEngineThinking}
              className="w-full h-full"
              data-testid="interactive-chess-board"
            />
          </div>

          {/* Compact navigation under board */}
          <div className="flex justify-center">
            <MoveControls
              currentMove={isAnalysisMode ? Math.ceil(exploratoryMoves.length / 2) : Math.ceil(currentMove / 2)}
              totalMoves={isAnalysisMode ? Math.ceil(exploratoryMoves.length / 2) : Math.ceil(moveHistory.length / 2)}
              isAutoPlaying={isAutoPlaying}
              onFirst={() => {
                if (!isAnalysisMode) goToMove(0);
              }}
              onPrevious={() => {
                if (isAnalysisMode && exploratoryMoves.length > 0) {
                  analysisModeChess.undo();
                  setExploratoryMoves(prev => prev.slice(0, -1));
                  setFen(analysisModeChess.fen());
                } else if (currentMove > 0) {
                  goToMove(currentMove - 1);
                }
              }}
              onNext={() => {
                if (!isAnalysisMode && currentMove < moveHistory.length) {
                  goToMove(currentMove + 1);
                }
              }}
              onLast={() => {
                if (!isAnalysisMode) goToMove(moveHistory.length);
              }}
              onToggleAutoPlay={() => setIsAutoPlaying(!isAutoPlaying)}
              disabled={false}
            />
          </div>

          {isEngineThinking && (
            <div className="flex items-center justify-center gap-2 text-sm text-primary py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Coach is thinking...</span>
            </div>
          )}
        </div>

        {/* Right Panel - Analysis/Moves/Coach */}
        <div className="overflow-hidden">
          <RightPanel
            analysis={currentAnalysis}
            moveHistory={moveHistory}
            currentMove={currentMove}
            isSpeaking={isSpeaking}
            exploratoryMoves={exploratoryMoves}
            isAnalysisMode={isAnalysisMode}
            onAskQuestion={(q) => askQuestionMutation.mutate(q)}
            lastAnswer={lastAnswer}
            games={importedGames}
            onSelectGame={(index: number) => {
              const game = importedGames[index];
              chess.reset();
              chess.loadPgn(game.pgn);
              const moves = chess.history();
              const finalFen = chess.fen();
              const lastMoveObj = chess.history({ verbose: true}).slice(-1)[0];
              setMoveHistory(moves);
              setCurrentMove(moves.length);
              setFen(finalFen);
              setLastMove(lastMoveObj ? { from: lastMoveObj.from, to: lastMoveObj.to } : null);
              setCurrentAnalysis(null);
              setIsAnalysisMode(false);
              console.log('[games] selected game', index, game.white, 'vs', game.black);
            }}
          />
        </div>
      </div>

      {/* Hotfix v5.1.1: Single Import Dialog (auto-detects PGN/FEN) */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import</DialogTitle>
            <DialogDescription>
              Paste PGN/FEN or upload .pgn file - automatic detection
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 pt-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="file-input">Upload .PGN File</Label>
              <input
                id="file-input"
                type="file"
                accept=".pgn"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const content = ev.target?.result as string;
                      setImportInput(content);
                    };
                    reader.readAsText(file);
                  }
                }}
                className="text-sm"
                data-testid="input-file-pgn"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="import-input">Or Paste PGN/FEN</Label>
              <Textarea
                id="import-input"
                placeholder="[Event ...] 1. e4 e5 2. Nf3... OR rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"
                value={importInput}
                onChange={(e) => setImportInput(e.target.value)}
                className="font-mono text-xs min-h-[200px]"
                data-testid="import-textarea"
              />
            </div>
            <Button onClick={handleImport} data-testid="button-import-dialog">
              <Upload className="w-4 h-4 mr-2" />
              Import
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Mobile Dock */}
      <MobileDock
        onLoad={() => setImportDialogOpen(true)}
        onPrevious={() => {
          if (currentMove > 0) goToMove(currentMove - 1);
        }}
        onNext={() => {
          if (currentMove < moveHistory.length) goToMove(currentMove + 1);
        }}
        onFlip={() => {}}
        onVoice={() => {
          // Switch to Coach tab on mobile
          toast({
            title: "Coach Tab",
            description: "Switch to the Coach tab in the right panel to ask questions",
          });
        }}
        canGoPrevious={currentMove > 0}
        canGoNext={currentMove < moveHistory.length}
      />
    </div>
  );
}
