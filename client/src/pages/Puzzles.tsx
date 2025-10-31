import { useState, useEffect, useRef } from "react";
import { Chess } from "chess.js";
import { InteractiveChessBoard } from "@/components/InteractiveChessBoard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Trophy, RotateCcw, Eye, Target, ArrowRight, CheckCircle2, XCircle, BarChart3, Download, Filter } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Puzzle } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

// Available themes for filtering
const AVAILABLE_THEMES = [
  "Back rank mate",
  "Material gain",
  "Knight attack",
  "Central control",
  "Double attack",
  "Fork",
  "Pin",
  "Skewer",
  "Discovered attack",
];

export default function Puzzles() {
  const { toast } = useToast();
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [chess] = useState(new Chess());
  const [currentFen, setCurrentFen] = useState("");
  const [attemptStatus, setAttemptStatus] = useState<"idle" | "correct" | "incorrect">("idle");
  const startTimeRef = useRef<number>(Date.now());
  
  // Filter state
  const [showFilters, setShowFilters] = useState(false);
  const [ratingRange, setRatingRange] = useState<[number, number]>([600, 1400]);
  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);

  // Build query string for filters
  const buildQueryString = () => {
    const params = new URLSearchParams();
    if (ratingRange[0] > 600) params.append('minRating', ratingRange[0].toString());
    if (ratingRange[1] < 1400) params.append('maxRating', ratingRange[1].toString());
    if (selectedThemes.length > 0) params.append('themes', selectedThemes.join(','));
    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  };

  // Fetch puzzles from API with filters
  const { data: puzzles, isLoading } = useQuery<Puzzle[]>({
    queryKey: ["/api/puzzles", ratingRange, selectedThemes],
    queryFn: async () => {
      const queryString = buildQueryString();
      const response = await fetch(`/api/puzzles${queryString}`);
      if (!response.ok) throw new Error('Failed to fetch puzzles');
      return response.json();
    },
  });

  // Seed puzzles mutation
  const seedPuzzlesMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/puzzles/seed", {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/puzzles"] });
      toast({
        title: "Puzzles Seeded",
        description: "Sample puzzles have been added to the database",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Seed Puzzles",
        description: error.message || "Could not seed puzzles",
        variant: "destructive",
      });
    },
  });

  // Record puzzle attempt mutation
  const recordAttemptMutation = useMutation({
    mutationFn: async ({ puzzleId, solved, timeSpent }: { puzzleId: number; solved: number; timeSpent: number }) => {
      const res = await apiRequest("POST", `/api/puzzles/${puzzleId}/attempt`, {
        solved,
        timeSpent,
        userId: null,
      });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/stats/puzzles"] });
    },
  });

  // Import daily puzzle from Lichess
  const importDailyPuzzleMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/puzzles/import-daily", {});
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/puzzles"] });
      toast({
        title: "Puzzle Imported",
        description: "Daily puzzle from Lichess has been imported successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Import Puzzle",
        description: error.message || "Could not import daily puzzle from Lichess",
        variant: "destructive",
      });
    },
  });

  // Reset FEN when puzzle changes
  useEffect(() => {
    if (puzzles && puzzles[currentPuzzleIndex]) {
      const puzzle = puzzles[currentPuzzleIndex];
      try {
        chess.load(puzzle.fen);
        setCurrentFen(puzzle.fen);
        setAttemptStatus("idle");
        startTimeRef.current = Date.now(); // Reset timer for new puzzle
      } catch (error) {
        console.error("Failed to load puzzle FEN:", error);
      }
    }
  }, [currentPuzzleIndex, puzzles, chess]);

  // Handle user move
  const handleMove = (move: { from: string; to: string }) => {
    const puzzle = puzzles?.[currentPuzzleIndex];
    if (!puzzle) {
      console.log("No puzzle available");
      return false;
    }

    console.log("Attempting move:", move, "Expected solution:", puzzle.solution);

    try {
      // Try to make the move
      const result = chess.move({ from: move.from, to: move.to });
      
      if (result) {
        console.log("Move made successfully:", result.san, "FEN:", chess.fen());
        
        // Update the FEN first
        setCurrentFen(chess.fen());
        
        // Check if this is the correct solution
        const moveNotation = result.san;
        console.log("Comparing:", moveNotation, "vs", puzzle.solution);
        
        if (moveNotation === puzzle.solution || result.lan === puzzle.solution || result.from + result.to === puzzle.solution) {
          setAttemptStatus("correct");
          
          // Calculate time spent
          const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
          
          // Record successful attempt
          recordAttemptMutation.mutate({
            puzzleId: puzzle.id,
            solved: 1,
            timeSpent,
          });
          
          toast({
            title: "¡Correcto!",
            description: `Has resuelto el puzzle en ${timeSpent} segundos`,
          });
          return true;
        } else {
          // Calculate time spent
          const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
          
          // Record failed attempt
          recordAttemptMutation.mutate({
            puzzleId: puzzle.id,
            solved: 0,
            timeSpent,
          });
          
          // Don't undo immediately - let the user see their move
          setTimeout(() => {
            chess.undo();
            setCurrentFen(chess.fen());
            setAttemptStatus("idle");
          }, 1000);
          
          setAttemptStatus("incorrect");
          toast({
            title: "Incorrecto",
            description: `Intentaste ${moveNotation}, pero la solución es diferente`,
            variant: "destructive",
          });
          return false;
        }
      }
      console.log("Move failed - chess.move returned null");
      return false;
    } catch (error) {
      console.error("Invalid move error:", error);
      return false;
    }
  };

  // Reset puzzle
  const resetPuzzle = () => {
    const puzzle = puzzles?.[currentPuzzleIndex];
    if (puzzle) {
      chess.load(puzzle.fen);
      setCurrentFen(puzzle.fen);
      setAttemptStatus("idle");
      setShowSolution(false);
    }
  };

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading puzzles...</p>
      </div>
    );
  }

  // Show seed button if no puzzles
  if (!puzzles || puzzles.length === 0) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">No puzzles available</p>
        <Button 
          onClick={() => seedPuzzlesMutation.mutate()} 
          disabled={seedPuzzlesMutation.isPending}
          data-testid="button-seed-puzzles"
        >
          {seedPuzzlesMutation.isPending ? "Seeding..." : "Seed Sample Puzzles"}
        </Button>
        <Link href="/">
          <Button variant="outline">Back to Trainer</Button>
        </Link>
      </div>
    );
  }

  const currentPuzzle = puzzles[currentPuzzleIndex];
  
  // Defensive: Validate puzzle data before using
  if (!currentPuzzle?.fen || !currentPuzzle?.solution) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">Invalid puzzle data</p>
        <Link href="/">
          <Button variant="outline">Back to Trainer</Button>
        </Link>
      </div>
    );
  }
  
  // Load FEN with error handling (chess.load throws error for invalid FEN)
  try {
    chess.load(currentPuzzle.fen);
  } catch (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-destructive">Invalid FEN: {currentPuzzle.fen}</p>
        <Link href="/">
          <Button variant="outline">Back to Trainer</Button>
        </Link>
      </div>
    );
  }

  const nextPuzzle = () => {
    if (!puzzles) return;
    const nextIndex = (currentPuzzleIndex + 1) % puzzles.length;
    setCurrentPuzzleIndex(nextIndex);
    setShowSolution(false);
    setAttemptStatus("idle");
  };

  const previousPuzzle = () => {
    if (!puzzles) return;
    const prevIndex = (currentPuzzleIndex - 1 + puzzles.length) % puzzles.length;
    setCurrentPuzzleIndex(prevIndex);
    setShowSolution(false);
    setAttemptStatus("idle");
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Target className="h-7 w-7 text-primary" />
              <h1 className="text-2xl font-bold" data-testid="text-puzzles-title">
                Tactics Puzzles
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                variant={showFilters ? "default" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                data-testid="button-toggle-filters"
              >
                <Filter className="w-4 h-4 mr-2" />
                Filters {selectedThemes.length > 0 && `(${selectedThemes.length})`}
              </Button>
              <Link href="/stats">
                <Button variant="outline" data-testid="button-view-stats">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  View Progress
                </Button>
              </Link>
              <Link href="/">
                <Button variant="outline" data-testid="button-back-to-trainer">
                  Back to Trainer
                </Button>
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Filters Panel */}
      {showFilters && (
        <div className="border-b bg-muted/30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Rating Range Filter */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Difficulty Range</Label>
                  <span className="text-sm text-muted-foreground">
                    {ratingRange[0]} - {ratingRange[1]}
                  </span>
                </div>
                <Slider
                  min={600}
                  max={1400}
                  step={50}
                  value={ratingRange}
                  onValueChange={(value) => setRatingRange(value as [number, number])}
                  className="w-full"
                  data-testid="slider-rating-range"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Beginner (600)</span>
                  <span>Advanced (1400)</span>
                </div>
              </div>

              {/* Theme Filter */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold">Themes</Label>
                  {selectedThemes.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedThemes([])}
                      data-testid="button-clear-themes"
                    >
                      Clear
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {AVAILABLE_THEMES.map((theme) => (
                    <div key={theme} className="flex items-center space-x-2">
                      <Checkbox
                        id={`theme-${theme}`}
                        checked={selectedThemes.includes(theme)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedThemes([...selectedThemes, theme]);
                          } else {
                            setSelectedThemes(selectedThemes.filter(t => t !== theme));
                          }
                        }}
                        data-testid={`checkbox-theme-${theme.toLowerCase().replace(/ /g, '-')}`}
                      />
                      <label
                        htmlFor={`theme-${theme}`}
                        className="text-sm cursor-pointer select-none"
                      >
                        {theme}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Results Count */}
            <div className="mt-4 pt-4 border-t flex items-center justify-between">
              <span className="text-sm text-muted-foreground" data-testid="text-filtered-count">
                Showing {puzzles?.length || 0} puzzle{puzzles?.length !== 1 ? 's' : ''}
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRatingRange([600, 1400]);
                  setSelectedThemes([]);
                }}
                data-testid="button-clear-all-filters"
              >
                Clear All Filters
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
          {/* Chess Board */}
          <div className="flex flex-col gap-4">
            <div className="relative">
              <InteractiveChessBoard
                fen={currentFen || currentPuzzle.fen}
                onMove={handleMove}
                showLegalMoves={true}
                disabled={attemptStatus === "correct"}
                className="w-full max-w-2xl mx-auto"
              />
              
              {/* Status overlay */}
              {attemptStatus === "correct" && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="bg-green-500/90 text-white px-6 py-3 rounded-lg flex items-center gap-2 shadow-lg">
                    <CheckCircle2 className="w-6 h-6" />
                    <span className="font-bold">¡Correcto!</span>
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-center flex-wrap">
              <Button
                onClick={previousPuzzle}
                variant="outline"
                data-testid="button-previous-puzzle"
              >
                Previous
              </Button>
              <Button
                onClick={resetPuzzle}
                variant="outline"
                data-testid="button-reset-puzzle"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button
                onClick={() => setShowSolution(!showSolution)}
                variant={showSolution ? "secondary" : "default"}
                data-testid="button-show-solution"
              >
                <Eye className="w-4 h-4 mr-2" />
                {showSolution ? "Hide" : "Show"} Solution
              </Button>
              <Button
                onClick={nextPuzzle}
                data-testid="button-next-puzzle"
              >
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                onClick={() => importDailyPuzzleMutation.mutate()}
                variant="default"
                disabled={importDailyPuzzleMutation.isPending}
                data-testid="button-import-lichess"
              >
                <Download className="w-4 h-4 mr-2" />
                {importDailyPuzzleMutation.isPending ? "Importing..." : "Import from Lichess"}
              </Button>
            </div>
            
            {/* Puzzle count indicator */}
            <div className="text-center text-sm text-muted-foreground">
              Puzzle {currentPuzzleIndex + 1} of {puzzles.length}
            </div>
          </div>

          {/* Puzzle Info */}
          <div className="flex flex-col gap-4">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                Puzzle #{currentPuzzleIndex + 1}
              </h2>
              
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Theme:</span>
                  <span className="font-medium" data-testid="text-puzzle-theme">
                    {currentPuzzle.theme}
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Difficulty:</span>
                  <span className="font-medium" data-testid="text-puzzle-rating">
                    {currentPuzzle.rating}
                  </span>
                </div>

                <div className="mt-4 p-3 bg-muted rounded-md">
                  <p className="text-sm font-medium mb-1">
                    To Move: {chess.turn() === "w" ? "White" : "Black"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Find the best move in this position
                  </p>
                </div>
              </div>

              {showSolution && (
                <div className="mt-6 p-4 bg-primary/10 border border-primary/20 rounded-md">
                  <div className="flex items-center gap-2 text-primary mb-2">
                    <Trophy className="w-5 h-5" />
                    <span className="font-semibold">Solution</span>
                  </div>
                  <p className="font-mono text-lg mb-2">
                    {currentPuzzle.solution}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {currentPuzzle.explanation}
                  </p>
                </div>
              )}
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-3">How to Practice</h3>
              <ul className="text-sm text-muted-foreground space-y-2">
                <li>• Study the position carefully</li>
                <li>• Think about the best move</li>
                <li>• Click "Show Solution" to check your answer</li>
                <li>• Use Previous/Next to navigate puzzles</li>
              </ul>
            </Card>

            <Card className="p-6">
              <h3 className="font-semibold mb-3">Puzzle Statistics</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Puzzles:</span>
                  <span className="font-medium">{puzzles.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current:</span>
                  <span className="font-medium">{currentPuzzleIndex + 1}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Difficulty Range:</span>
                  <span className="font-medium">800-1400</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
