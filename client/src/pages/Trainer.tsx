import React, { useState, useEffect, Suspense, lazy, useMemo } from "react";
import { Chess } from "chess.js";
import { MoveControls } from "@/components/MoveControls";
import { useToast } from "@/hooks/use-toast";
import { Game, MoveAnalysis } from "@shared/schema";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useSearch, useLocation } from "wouter";
import { useVoice } from "@/hooks/use-voice";
import { ActionPanel } from "@/components/ActionPanel";
import { MobileDock } from "@/components/MobileDock";
import { PositionEditor } from "@/components/PositionEditor";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2 } from "lucide-react";
import { useRef } from "react";
import { UpgradeModal } from "@/components/UpgradeModal"; // feat(subscriptions)

const InteractiveChessBoard = lazy(() => import("@/components/InteractiveChessBoard").then(m => ({ default: m.InteractiveChessBoard })));
const RightPanel = lazy(() => import("@/components/RightPanel").then(m => ({ default: m.RightPanel })));
const GameInfo = lazy(() => import("@/components/GameInfo").then(m => ({ default: m.GameInfo })));
const AnalysisPanel = lazy(() => import("@/components/AnalysisPanel").then(m => ({ default: m.AnalysisPanel })));

const STARTING_FEN = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

/* FIX BLOCKERS v1: PGN demo corto (3–6 jugadas) para navegación básica */
const DEMO_PGN = `[Event "Demo"]
[Site "Local"]
[Date "2025.11.05"]
[Round "-"]
[White "White"]
[Black "Black"]
[Result "*"]

1. e4 e5 2. Nf3 Nc6 3. Bb5 a6 *`;

/* Helper: construir juego cargado desde PGN con acceso a FEN por índice */
function makeLoadedGame(pgn?: string) {
  const c = new Chess();
  let moves: string[] = [];
  if (pgn && pgn.trim()) {
    try {
      c.reset();
      c.loadPgn(pgn);
      moves = c.history();
      c.reset();
    } catch (_e) {
      moves = [];
    }
  }
  // Precalcular FENs (inicio + después de cada movimiento)
  const fens: string[] = [];
  c.reset();
  fens.push(c.fen());
  for (const m of moves) {
    try {
      c.move(m);
      fens.push(c.fen());
    } catch {
      break;
    }
  }
  return {
    moves,
    movesCount: Math.max(0, fens.length - 1),
    fenAt: (i: number) => {
      const idx = Math.max(0, Math.min(i, fens.length - 1));
      return fens[idx];
    },
  };
}

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
  const boardWrapperRef = useRef<HTMLDivElement | null>(null);
  
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
  /* FIX BLOCKERS v1: precargar PGN demo para DX rápida */
  const [importInput, setImportInput] = useState(DEMO_PGN);
  const [lichessUrl, setLichessUrl] = useState("");
  const [chessUrl, setChessUrl] = useState("");
  
  // v7.0: Position Editor
  const [editorOpen, setEditorOpen] = useState(false);
  
  // feat(subscriptions): Upgrade modal
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [upgradeModalReason, setUpgradeModalReason] = useState<'TRIAL_ENDED' | 'UPGRADE_REQUIRED'>('TRIAL_ENDED');
  const [upgradeModalCurrentPlan, setUpgradeModalCurrentPlan] = useState<string>('free');
  const [upgradeModalRequiredPlan, setUpgradeModalRequiredPlan] = useState<string>('pro');
  
  // HOTFIX v6.2: Multi-game import from file
  const [importedGames, setImportedGames] = useState<Array<{pgn: string; white: string; black: string; result: string; eco: string; date: string}>>([]);
  
  const [loadRightPanel, setLoadRightPanel] = useState(typeof window !== "undefined" ? window.innerWidth >= 1024 : false);
  const [loadGameInfo, setLoadGameInfo] = useState(false);
  const [loadAnalysisPanel, setLoadAnalysisPanel] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const [engineDepth, setEngineDepth] = useState(0);

  // Fuente de verdad única para el juego cargado (evita TDZ/sombras)
  const loadedGameRef = useRef<ReturnType<typeof makeLoadedGame> | null>(null);

  // Adaptador de "drawBoard" a nuestro renderer React
  const drawBoardFromFen = (fenStr: string) => {
    try {
      setFen(fenStr);
    } catch {}
  };

  // proactively load secondary panels when user interacts with board area (non-visual change)
  useEffect(() => {
    const el = boardWrapperRef.current;
    if (!el) {
      // fallback: schedule idle load for non-critical panels
      const t = typeof (window as any).requestIdleCallback === "function"
        ? (window as any).requestIdleCallback(() => {
            setLoadRightPanel(true);
            setLoadGameInfo(true);
            setLoadAnalysisPanel(true);
          })
        : window.setTimeout(() => {
            setLoadRightPanel(true);
            setLoadGameInfo(true);
            setLoadAnalysisPanel(true);
          }, 1500);
      return () => {
        if ((window as any).cancelIdleCallback) {
          (window as any).cancelIdleCallback(t);
        } else {
          clearTimeout(t as number);
        }
      };
    }
    const onEnter = () => {
      setLoadRightPanel(true);
      setLoadGameInfo(true);
      setLoadAnalysisPanel(true);
    };
    el.addEventListener("mouseenter", onEnter, { once: true });
    el.addEventListener("touchstart", onEnter, { once: true });
    return () => {
      el.removeEventListener("mouseenter", onEnter);
      el.removeEventListener("touchstart", onEnter);
    };
  }, []);

  // Initialize local Stockfish worker (WASM) with CDN fallback
  useEffect(() => {
    console.log('[init] creating stockfish worker at /engine/worker.js');
    const w = new Worker('/engine/worker.js');
    workerRef.current = w;

    w.onerror = (err: any) => {
      console.log('[engine:error] worker error', err?.message || err);
    };

    w.onmessage = (ev: MessageEvent<any>) => {
      const msg = ev.data || {};
      if (msg.type === 'ready') {
        console.log('[engine] ready');
        return;
      }
      if (msg.type === 'error') {
        console.log('[engine:error]', msg.error || msg);
        return;
      }
      if (msg.type === 'result') {
        console.log('[engine:result] bestMove=', msg.bestMove);
        return;
      }
      if (msg.type === 'info') {
        if (typeof msg.depth === 'number') setEngineDepth(msg.depth);
        if (msg.score !== undefined || msg.mate !== undefined || msg.best !== undefined) {
          setCurrentAnalysis(prev => ({
            ...(prev || ({ analysis: "" } as any)),
            score: msg.score !== undefined ? msg.score : (prev as any)?.score,
            mate: msg.mate !== undefined ? msg.mate : (prev as any)?.mate,
            bestMove: msg.best !== undefined ? msg.best : (prev as any)?.bestMove,
          }) as any);
        }
        return;
      }
    };

    return () => {
      try { w.postMessage({ cmd: 'quit' }); } catch {}
      w.terminate();
      workerRef.current = null;
    };
  }, []);

  // Init seguro: inicializa loadedGameRef con PGN demo y dibuja tablero (no bloquea render)
  useEffect(() => {
    try {
      loadedGameRef.current = makeLoadedGame(DEMO_PGN);
      setMoveHistory(loadedGameRef.current.moves);
      setCurrentMove(0);
      drawBoardFromFen(loadedGameRef.current.fenAt?.(0) ?? STARTING_FEN);
      console.log('[Trainer] init OK');
    } catch (_e) {
      drawBoardFromFen(STARTING_FEN);
    }
  }, []);

  /* FIX BLOCKERS v1: Autocargar PGN demo si no hay partida y no hay historial */
  useEffect(() => {
    if (moveHistory.length === 0 && !gameIdParam) {
      try {
        console.log('[demo] loading embedded demo PGN');
        const games = splitPgn(DEMO_PGN);
        setAvailablePgns(games);
        setCurrentGameIndex(0);

        chess.reset();
        chess.loadPgn(games[0]);
        const moves = chess.history();
        const finalFen = chess.fen();
        const lastMoveObj = chess.history({ verbose: true }).slice(-1)[0];

        // Registrar lista en pestaña Games
        const meta = parsePgnMeta(games[0]);
        setImportedGames(games.map((pgn) => {
          const m = parsePgnMeta(pgn);
          return {
            pgn,
            white: m.white || "White",
            black: m.black || "Black",
            result: m.result || "*",
            eco: m.eco || "",
            date: m.date || "",
          };
        }));

        setGame({
          id: 0,
          white: meta.white || "White",
          black: meta.black || "Black",
          result: null,
          event: meta.event || "Demo",
          site: "Local",
          opening: null,
          date: meta.date || null,
          pgn: games[0],
          createdAt: new Date(),
        } as any);

        setMoveHistory(moves);
        setCurrentMove(moves.length);
        setFen(finalFen);
        setLastMove(lastMoveObj ? { from: lastMoveObj.from, to: lastMoveObj.to } : null);
        setCurrentAnalysis(null);
        setIsAnalysisMode(false);
        console.log('[demo] demo PGN loaded, moves=', moves.length);
      } catch (e) {
        console.log('[demo] failed to load demo PGN', e);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameIdParam, moveHistory.length]);

  console.log('[init] board shell ready (aspect 1:1, max 720px)');
  console.log('[mode] free-analysis ready | training=ON | interactive=drag+tap');

  // Load game from history if gameId is in URL
  const { data: loadedGameData } = useQuery<Game>({
    queryKey: [`/api/games/${gameIdParam}`],
    enabled: !!gameIdParam,
  });

  // Get move analysis mutation - feat(subscriptions): handle 402 errors
  const analyzeMoveMutation = useMutation({
    mutationFn: async (moveData: { moveNumber: number; move: string; fen: string }) => {
      const settings = getUserSettings();
      const res = await apiRequest("POST", "/api/analysis/move", { 
        ...moveData, 
        settings,
        voiceMode,
        muted,
      });
      
      // Handle 402 Payment Required (trial ended or upgrade required)
      if (res.status === 402) {
        const errorData = await res.json();
        throw { status: 402, ...errorData };
      }
      
      if (!res.ok) {
        throw new Error(`Analysis failed: ${res.statusText}`);
      }
      
      return await res.json();
    },
    onSuccess: (data: MoveAnalysis & { audioUrl?: string; plan?: string; trialUsed?: boolean }) => {
      setCurrentAnalysis(data);
      console.log('[coach] onUserMove fen=', fen.split(' ')[0], 'eval=', data.score || data.mate, 'plan=', data.plan);
      
      speak(data.audioUrl);
      if (data.audioUrl && !muted) {
        setIsSpeaking(true);
        setTimeout(() => setIsSpeaking(false), 3000);
      }
    },
    onError: (error: any) => {
      if (error.status === 402) {
        // Show upgrade modal
        setUpgradeModalReason(error.reason || 'TRIAL_ENDED');
        setUpgradeModalCurrentPlan(error.currentPlan || 'free');
        setUpgradeModalRequiredPlan(error.requiredPlan || 'pro');
        setUpgradeModalOpen(true);
        
        toast({
          title: "Sesión PRO terminada",
          description: "Tu sesión avanzada ha terminado. Activa PRO para continuar.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error de análisis",
          description: error.message || "No se pudo analizar el movimiento",
          variant: "destructive",
        });
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
    const lg = loadedGameRef.current;
    if (lg) {
      const clamped = Math.max(0, Math.min(moveIndex, lg.movesCount));
      console.log('[Trainer] nav ->', clamped);
      setCurrentMove(clamped);
      drawBoardFromFen(lg.fenAt(clamped));
      if (clamped === 0) setCurrentAnalysis(null);
      return;
    }

    // Fallback al flujo existente basado en moveHistory/Chess.js
    if (moveIndex < 0 || moveIndex > moveHistory.length) return;

    chess.reset();
    let lastMoveInfo: any = null;

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
    if (loadedGameData && loadedGameData.pgn) {
      const games = splitPgn(loadedGameData.pgn);
      console.log('[games] loaded:', games.length);

      setAvailablePgns(games);
      setCurrentGameIndex(0);

      const firstPgn = games[0];
      chess.loadPgn(firstPgn);
      const moves = chess.history();
      const finalFen = chess.fen();
      const lastMoveObj = chess.history({ verbose: true }).slice(-1)[0];
      chess.reset();

      // Actualizar referencia de juego cargado y dibujar desde inicio
      try {
        loadedGameRef.current = makeLoadedGame(loadedGameData.pgn);
        drawBoardFromFen(loadedGameRef.current.fenAt(0));
      } catch {
        drawBoardFromFen(finalFen);
      }

      setGame(loadedGameData);
      setMoveHistory(moves);
      setCurrentMove(moves.length);
      setFen(finalFen);
      setLastMove(lastMoveObj ? { from: lastMoveObj.from, to: lastMoveObj.to } : null);
      setCurrentAnalysis(null);
      setIsAnalysisMode(false); // Switch to game view mode
    }
  }, [loadedGameData, chess]);

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

        // Local Stockfish worker analysis (non-blocking)
        try {
          const depth = window.innerWidth < 768 ? 12 : 18;
          workerRef.current?.postMessage({ cmd: 'analyze', fen: newFen, depth, multipv: 1 });
        } catch {}
        
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

  // Import from Lichess URL
  const importFromLichess = async () => {
    const url = lichessUrl.trim();
    if (!url) {
      toast({ title: "URL requerida", description: "Ingresa una URL de Lichess", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch('/api/games/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'url', value: url }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const game = await res.json();
      const pgn = game.pgn || '';
      const games = splitPgn(pgn);
      setAvailablePgns(games);
      setCurrentGameIndex(0);
      chess.reset();
      chess.loadPgn(games[0]);
      const moves = chess.history();
      const finalFen = chess.fen();
      const lastMoveObj = chess.history({ verbose: true }).slice(-1)[0];
      setGame(game);
      setMoveHistory(moves);
      setCurrentMove(moves.length);
      setFen(finalFen);
      setLastMove(lastMoveObj ? { from: lastMoveObj.from, to: lastMoveObj.to } : null);
      setCurrentAnalysis(null);
      setIsAnalysisMode(false);
      setImportDialogOpen(false);
      setLichessUrl('');
      toast({ title: "Game Loaded (Lichess)", description: `${parsePgnMeta(pgn).white} vs ${parsePgnMeta(pgn).black}` });
    } catch (e:any) {
      toast({ title: "Error", description: e.message || "No se pudo cargar desde Lichess", variant: "destructive" });
    }
  };

  // Import from Chess.com URL
  const importFromChessCom = async () => {
    const url = chessUrl.trim();
    if (!url) {
      toast({ title: "URL requerida", description: "Ingresa una URL de Chess.com", variant: "destructive" });
      return;
    }
    try {
      const res = await fetch('/api/games/import-chesscom', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const game = await res.json();
      const pgn = game.pgn || '';
      const games = splitPgn(pgn);
      setAvailablePgns(games);
      setCurrentGameIndex(0);
      chess.reset();
      chess.loadPgn(games[0]);
      const moves = chess.history();
      const finalFen = chess.fen();
      const lastMoveObj = chess.history({ verbose: true }).slice(-1)[0];
      setGame(game);
      setMoveHistory(moves);
      setCurrentMove(moves.length);
      setFen(finalFen);
      setLastMove(lastMoveObj ? { from: lastMoveObj.from, to: lastMoveObj.to } : null);
      setCurrentAnalysis(null);
      setIsAnalysisMode(false);
      setImportDialogOpen(false);
      setChessUrl('');
      toast({ title: "Game Loaded (Chess.com)", description: `${parsePgnMeta(pgn).white} vs ${parsePgnMeta(pgn).black}` });
    } catch (e:any) {
      toast({ title: "Error", description: e.message || "No se pudo cargar desde Chess.com", variant: "destructive" });
    }
  };
  
  // Flip board orientation
  const handleFlipBoard = () => {
    setBoardOrientation(prev => prev === "white" ? "black" : "white");
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

  // v7.0: Load position from editor
  const handleLoadPosition = (fen: string) => {
    try {
      analysisModeChess.load(fen);
      setFen(fen);
      setExploratoryMoves([]);
      setLastMove(null);
      setCurrentAnalysis(null);
      toast({
        title: "Posición cargada",
        description: "La posición personalizada ha sido cargada en el tablero",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "FEN inválido",
        variant: "destructive",
      });
    }
  };

  // v7.0: Export PGN with local heuristic comments (no GPT)
  const handleExportPgn = () => {
    if (moveHistory.length === 0) {
      toast({
        title: "Sin movimientos",
        description: "No hay movimientos para exportar",
        variant: "destructive",
      });
      return;
    }

    // Generate PGN with heuristic comments
    const tempChess = new Chess();
    let pgn = '[Event "GM Trainer Analysis"]\n';
    pgn += '[Site "GM Trainer Local"]\n';
    pgn += `[Date "${new Date().toISOString().split('T')[0]}"]\n`;
    pgn += '[White "Player"]\n';
    pgn += '[Black "Player"]\n';
    pgn += '[Result "*"]\n\n';

    let moveNumber = 1;
    moveHistory.forEach((move, index) => {
      const moveObj = tempChess.move(move);
      if (!moveObj) return;

      // Add move number for white
      if (index % 2 === 0) {
        pgn += `${moveNumber}. `;
      }

      // Add the move
      pgn += move + ' ';

      // Generate simple heuristic comment
      const comments = [];
      
      // Check for capture
      if (moveObj.captured) {
        comments.push('Captura material');
      }
      
      // Check for check
      if (tempChess.inCheck()) {
        comments.push('Jaque');
      }
      
      // Check for checkmate
      if (tempChess.isCheckmate()) {
        comments.push('Jaque mate!');
      }
      
      // Check for center control (e4, d4, e5, d5)
      if (['e4', 'd4', 'e5', 'd5'].includes(moveObj.to)) {
        comments.push('Control del centro');
      }
      
      // Check for piece development (knights and bishops in opening)
      if (index < 10 && (moveObj.piece === 'n' || moveObj.piece === 'b')) {
        comments.push('Desarrollo de piezas');
      }
      
      // Check for castling
      if (moveObj.flags.includes('k') || moveObj.flags.includes('q')) {
        comments.push('Enroque - Seguridad del rey');
      }

      // Add comment if any
      if (comments.length > 0) {
        pgn += `{ ${comments.join(', ')} } `;
      }

      // New line after black's move
      if (index % 2 === 1) {
        pgn += '\n';
        moveNumber++;
      }
    });

    pgn += '*\n';

    // Download the PGN file
    const blob = new Blob([pgn], { type: 'application/x-chess-pgn' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gm-trainer-${Date.now()}.pgn`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast({
      title: "PGN exportado",
      description: "Archivo descargado con comentarios de análisis",
    });
  };

  // Movimientos a mostrar según modo (análisis libre vs partida cargada)
  const displayMoves = isAnalysisMode ? exploratoryMoves : moveHistory;

  // Heurística simple: calidad por diferencia de evaluación material entre jugadas
  const moveQualities = useMemo(() => {
    type Quality = 'good' | 'inaccuracy' | 'mistake' | 'blunder' | null;
    const qualities: Quality[] = [];
    if (!displayMoves || displayMoves.length === 0) return qualities;

    const matValue: Record<string, number> = { p: 1, n: 3, b: 3.25, r: 5, q: 9, k: 0 };

    const evalMaterial = (fenStr: string): number => {
      try {
        const c = new Chess();
        c.load(fenStr);
        const board = c.board();
        let sum = 0;
        for (const row of board) {
          for (const sq of row) {
            if (!sq) continue;
            const v = matValue[sq.type] ?? 0;
            sum += sq.color === 'w' ? v : -v;
          }
        }
        return sum;
      } catch {
        return 0;
      }
    };

    const getFenAt = (ply: number): string => {
      // Preferir FENs precalculados cuando hay partida cargada
      if (!isAnalysisMode && loadedGameRef.current?.fenAt) {
        return loadedGameRef.current.fenAt(ply);
      }
      // Fallback: reconstruir aplicando jugadas desde el inicio
      try {
        const c = new Chess();
        for (let i = 0; i < Math.max(0, Math.min(ply, displayMoves.length)); i++) {
          try { c.move(displayMoves[i]); } catch { break; }
        }
        return c.fen();
      } catch {
        return STARTING_FEN;
      }
    };

    for (let i = 0; i < displayMoves.length; i++) {
      try {
        const beforeFen = getFenAt(i);
        const afterFen = getFenAt(i + 1);
        const beforeEval = evalMaterial(beforeFen);
        const afterEval = evalMaterial(afterFen);
        const isWhiteMove = i % 2 === 0;
        const diffFromMover = (afterEval - beforeEval) * (isWhiteMove ? 1 : -1);

        let q: Quality = null;
        if (diffFromMover >= 0.6) {
          q = 'good';
        } else if (diffFromMover >= 0.2) {
          q = 'inaccuracy';
        } else if (diffFromMover <= -0.4) {
          q = 'blunder';
        } else if (diffFromMover < -0.01) {
          q = 'mistake';
        } else {
          q = null;
        }

        qualities.push(q);
      } catch {
        qualities.push(null);
      }
    }
    return qualities;
  }, [displayMoves, isAnalysisMode]);

  // Render helper para aplicar color por calidad
  const renderMoveSpan = (moveText: string | undefined, idx: number) => {
    if (!moveText) return <span />;
    const q = moveQualities[idx] as any;
    const cls = q ? `move-quality ${q}` : '';
    return <span className={cls}>{moveText}</span>;
  };

  return (
    <div className="chesscom-layout">

      <div className="mx-auto max-w-[1400px] px-4 pt-4 pb-10 grid grid-cols-1 lg:grid-cols-[280px_minmax(640px,1fr)_380px] gap-4">

        {/* Left Panel (Historial) */}
        <div className="hidden lg:block">
          <h2 className="text-sm font-semibold mb-2">Historial</h2>
          <div className="flex-1 overflow-y-auto">
            {displayMoves.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin movimientos</p>
            ) : (
              <div className="grid grid-cols-[auto_1fr_1fr] gap-x-3 gap-y-1 font-mono text-xs">
                {displayMoves.map((_, index) => {
                  if (index % 2 === 0) {
                    const moveNumber = Math.floor(index / 2) + 1;
                    const whiteIdx = index;
                    const blackIdx = index + 1;
                    return (
                      <div key={index} className="contents">
                        <div className="text-muted-foreground">{moveNumber}.</div>
                        <div>{renderMoveSpan(displayMoves[whiteIdx], whiteIdx)}</div>
                        <div>{renderMoveSpan(displayMoves[blackIdx], blackIdx)}</div>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </div>
        </div>

        {/* COLUMNA CENTRAL: SOLO TABLERO */}
        <section className="lg:col-span-7 flex flex-col items-center justify-center w-full min-h-[calc(100vh-120px)]">
          <div ref={boardWrapperRef} className="board-wrap flex flex-col items-center w-full max-w-[820px]">
            <Suspense fallback={<div className="p-6">Cargando tablero…</div>}>
              <InteractiveChessBoard
                fen={fen}
                orientation={boardOrientation}
                onMove={handleMove}
                showLegalMoves
                disabled={isEngineThinking}
                className="board"
                data-testid="interactive-chess-board"
              />
            </Suspense>
          </div>
          <div className="mt-3 w-full max-w-[820px] flex justify-center">
            <div className="dock px-3 py-2 rounded-lg">
              <MoveControls
                currentMove={isAnalysisMode ? Math.ceil(exploratoryMoves.length/2)||0 : Math.ceil((currentMove||0)/2)||0}
                totalMoves={isAnalysisMode ? Math.ceil(exploratoryMoves.length/2)||0 : Math.ceil((moveHistory?.length||0)/2)||0}
                isAutoPlaying={isAutoPlaying}
                onFirst={()=>!isAnalysisMode && goToMove(0)}
                onPrevious={()=>{
                  if (isAnalysisMode && exploratoryMoves.length>0){ analysisModeChess.undo(); setExploratoryMoves(p=>p.slice(0,-1)); setFen(analysisModeChess.fen()); }
                  else if (currentMove>0){ goToMove(currentMove-1); }
                }}
                onNext={()=>{ if(!isAnalysisMode && currentMove<moveHistory.length){ goToMove(currentMove+1); } }}
                onLast={()=>!isAnalysisMode && goToMove(moveHistory.length)}
                onToggleAutoPlay={()=>setIsAutoPlaying(!isAutoPlaying)}
                disabled={false}
              />
            </div>
          </div>
          {isEngineThinking && (
            <div className="flex items-center gap-2 text-sm text-primary py-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>Coach pensando…</span>
            </div>
          )}
        </section>

        {/* Right Panel - Analysis/Moves/Coach */}
        <div className="lg:col-span-5 panel col-right panel-centered confined-scroll">
          {loadRightPanel ? (
            <>
              <ActionPanel
                isPlayVsCoach={isPlayVsCoach}
                playerColor={playerColor}
                isAutoPlaying={isAutoPlaying}
                canUndo={exploratoryMoves.length > 0}
                canRedo={false}
                onNewGame={handleNewGame}
                onImport={() => setImportDialogOpen(true)}
                onOpenEditor={() => setEditorOpen(true)}
                onFlipBoard={handleFlipBoard}
                onUndo={() => {
                  if (exploratoryMoves.length > 0) {
                    analysisModeChess.undo();
                    setExploratoryMoves(prev => prev.slice(0, -1));
                    setFen(analysisModeChess.fen());
                  }
                }}
                onRedo={() => {}}
                onToggleAutoPlay={() => setIsAutoPlaying(!isAutoPlaying)}
                onExportPgn={handleExportPgn}
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
              <Suspense fallback={<div className="p-4">Cargando panel...</div>}>
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
                currentFen={fen}
                onExportPgn={handleExportPgn}
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
            </Suspense>
            </>
          ) : (
            <div className="p-4" aria-hidden>
              {/* Placeholder to avoid layout shift; right panel will load after interaction */}
            </div>
          )}
        </div>
      </div>

      {/* Hotfix v5.1.1: Single Import Dialog (auto-detects PGN/FEN) */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import</DialogTitle>
            <DialogDescription>
              Paste PGN or upload .pgn file
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
                  const file = (e.target as HTMLInputElement).files?.[0];
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
              <Label htmlFor="import-input">Paste PGN</Label>
              <Textarea
                id="import-input"
                placeholder="[Event ...] 1. e4 e5 2. Nf3..."
                value={importInput}
                onChange={(e) => setImportInput((e.target as HTMLTextAreaElement).value)}
                className="font-mono text-xs min-h-[200px]"
                data-testid="import-textarea"
              />
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="lichess-url">Lichess URL</Label>
              <Input
                id="lichess-url"
                type="url"
                placeholder="https://lichess.org/..."
                value={lichessUrl}
                onChange={(e) => setLichessUrl((e.target as HTMLInputElement).value)}
                className="text-sm"
                data-testid="input-lichess-url"
              />
              <Button variant="secondary" className="btn btn-ghost" onClick={importFromLichess} data-testid="button-import-lichess">
                Cargar Lichess
              </Button>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="chesscom-url">Chess.com URL</Label>
              <Input
                id="chesscom-url"
                type="url"
                placeholder="https://www.chess.com/game/..."
                value={chessUrl}
                onChange={(e) => setChessUrl((e.target as HTMLInputElement).value)}
                className="text-sm"
                data-testid="input-chesscom-url"
              />
              <Button variant="secondary" className="btn btn-ghost" onClick={importFromChessCom} data-testid="button-import-chesscom">
                Cargar Chess.com
              </Button>
            </div>

            <Button onClick={handleImport} data-testid="button-import-dialog" className="btn btn-primary">
              <Upload className="w-4 h-4 mr-2" />
              Cargar partida
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* v7.0: Position Editor */}
      <PositionEditor
        open={editorOpen}
        onClose={() => setEditorOpen(false)}
        onLoadPosition={handleLoadPosition}
        initialFen={fen}
      />

      {/* Mobile Dock */}
      <MobileDock
        onLoad={() => setImportDialogOpen(true)}
        onPrevious={() => {
          if (currentMove > 0) goToMove(currentMove - 1);
        }}
        onNext={() => {
          if (currentMove < moveHistory.length) goToMove(currentMove + 1);
        }}
        onFlip={handleFlipBoard}
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

      {/* feat(subscriptions): Upgrade Modal */}
      <UpgradeModal
        open={upgradeModalOpen}
        onOpenChange={setUpgradeModalOpen}
      />
    </div>
  );
}
