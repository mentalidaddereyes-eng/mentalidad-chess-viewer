import { useState } from "react";
import { Chess } from "chess.js";
import { ChessBoard } from "@/components/ChessBoard";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Trophy, RotateCcw, Eye, Target, ArrowRight } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";

// Sample puzzles - in production, these would come from an API
const SAMPLE_PUZZLES = [
  {
    id: 1,
    fen: "r1bqkb1r/pppp1ppp/2n2n2/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR w KQkq - 0 1",
    solution: "Qxf7#",
    explanation: "Scholar's mate! The queen captures on f7 with checkmate.",
    theme: "Checkmate in 1",
    rating: 800,
  },
  {
    id: 2,
    fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1",
    solution: "Nxe5",
    explanation: "The knight takes the pawn on e5, winning material and threatening a fork.",
    theme: "Material gain",
    rating: 1000,
  },
  {
    id: 3,
    fen: "r2qkb1r/pp2pppp/2p2n2/3pNb2/3P4/2N1P3/PPP2PPP/R1BQKB1R w KQkq - 0 1",
    solution: "Nxf7",
    explanation: "Knight fork! Nxf7 attacks both the king and queen.",
    theme: "Knight fork",
    rating: 1200,
  },
  {
    id: 4,
    fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2BPP3/5N2/PPP2PPP/RNBQK2R w KQkq - 0 1",
    solution: "Bxf7+",
    explanation: "Bishop takes f7 with check, forcing the king to move and winning material.",
    theme: "Removing defender",
    rating: 1100,
  },
  {
    id: 5,
    fen: "r3k2r/p1ppqpb1/bn2pnp1/3PN3/1p2P3/2N2Q1p/PPPBBPPP/R3K2R w KQkq - 0 1",
    solution: "Qxf6",
    explanation: "The queen captures the knight on f6, threatening the bishop and maintaining pressure.",
    theme: "Tactical exchange",
    rating: 1400,
  },
];

export default function Puzzles() {
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [showSolution, setShowSolution] = useState(false);
  const [chess] = useState(new Chess());

  const currentPuzzle = SAMPLE_PUZZLES[currentPuzzleIndex];
  chess.load(currentPuzzle.fen);

  const nextPuzzle = () => {
    const nextIndex = (currentPuzzleIndex + 1) % SAMPLE_PUZZLES.length;
    setCurrentPuzzleIndex(nextIndex);
    setShowSolution(false);
  };

  const previousPuzzle = () => {
    const prevIndex = (currentPuzzleIndex - 1 + SAMPLE_PUZZLES.length) % SAMPLE_PUZZLES.length;
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
          </div>

          {/* Puzzle Info */}
          <div className="flex flex-col gap-4">
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">
                Puzzle #{currentPuzzle.id} of {SAMPLE_PUZZLES.length}
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
                  <span className="font-medium">{SAMPLE_PUZZLES.length}</span>
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
