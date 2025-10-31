import { useState } from "react";
import { Chess } from "chess.js";
import { ChessBoard } from "@/components/ChessBoard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Trophy, RotateCcw, Eye, Target, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { Puzzle } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

export default function Puzzles() {
  const { toast } = useToast();
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [chess] = useState(new Chess());

  // Fetch puzzles from API
  const { data: puzzles, isLoading } = useQuery<Puzzle[]>({
    queryKey: ["/api/puzzles"],
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
  };

  const previousPuzzle = () => {
    if (!puzzles) return;
    const prevIndex = (currentPuzzleIndex - 1 + puzzles.length) % puzzles.length;
    setCurrentPuzzleIndex(prevIndex);
    setShowSolution(false);
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

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-6">
          {/* Chess Board */}
          <div className="flex flex-col gap-4">
            <ChessBoard
              fen={currentPuzzle.fen}
              className="w-full max-w-2xl mx-auto"
              data-testid="puzzle-board"
            />

            <div className="flex gap-2 justify-center">
              <Button
                onClick={previousPuzzle}
                variant="outline"
                data-testid="button-previous-puzzle"
              >
                Previous
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
