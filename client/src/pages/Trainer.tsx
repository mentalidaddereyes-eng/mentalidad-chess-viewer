import { useState, useEffect } from "react";
import { Chess } from "chess.js";
import { ChessBoard } from "@/components/ChessBoard";
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
import { Trophy, History, Target, Settings } from "lucide-react";
import { Link, useSearch } from "wouter";
import { Button } from "@/components/ui/button";

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

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
      chess.loadPgn(data.pgn);
      const moves = chess.history();
      chess.reset();
      
      setGame(data);
      setMoveHistory(moves);
      setCurrentMove(0);
      setFen(STARTING_FEN);
      setLastMove(null);
      setCurrentAnalysis(null);
      
      toast({
        title: "Game Loaded",
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
      const res = await apiRequest("POST", "/api/analysis/move", { ...moveData, settings });
      return await res.json();
    },
    onSuccess: (data: MoveAnalysis & { audioUrl?: string }) => {
      setCurrentAnalysis(data);
      
      // Play audio if available
      if (data.audioUrl) {
        setIsSpeaking(true);
        const audio = new Audio(data.audioUrl);
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => setIsSpeaking(false);
        audio.play().catch(() => setIsSpeaking(false));
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
      });
      return await res.json();
    },
    onSuccess: (data: { answer: string; audioUrl?: string }) => {
      setLastQuestion(data.answer);
      
      if (data.audioUrl) {
        setIsSpeaking(true);
        const audio = new Audio(data.audioUrl);
        audio.onended = () => setIsSpeaking(false);
        audio.onerror = () => setIsSpeaking(false);
        audio.play().catch(() => setIsSpeaking(false));
      }
      
      toast({
        title: "Coach Responded",
        description: "Playing answer...",
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
      chess.loadPgn(loadedGame.pgn);
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

  const handleLoadGame = (value: string, type: "url" | "username") => {
    loadGameMutation.mutate({ value, type });
  };

  const handleAskQuestion = (question: string) => {
    askQuestionMutation.mutate(question);
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
          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 h-full">
            {/* Left Column - Chess Board */}
            <div className="flex flex-col gap-6">
              <ChessBoard
                fen={fen}
                lastMove={lastMove}
                className="w-full max-w-2xl mx-auto"
              />
              
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
                  disabled={!game}
                />
              </div>
            </div>

            {/* Right Column - Controls & Analysis */}
            <div className="flex flex-col gap-6 min-h-0">
              <GameInfo game={game} />
              
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
