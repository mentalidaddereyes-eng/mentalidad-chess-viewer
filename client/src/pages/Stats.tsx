import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { BarChart3, Trophy, Clock, Target, TrendingUp, ArrowLeft } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import type { PuzzleAttempt } from "@shared/schema";

interface PuzzleStats {
  totalAttempts: number;
  totalSolved: number;
  successRate: number;
  averageTime: number;
}

export default function Stats() {
  // Fetch puzzle statistics
  const { data: stats, isLoading: statsLoading } = useQuery<PuzzleStats>({
    queryKey: ["/api/stats/puzzles"],
  });

  // Fetch all attempts
  const { data: attempts, isLoading: attemptsLoading } = useQuery<PuzzleAttempt[]>({
    queryKey: ["/api/puzzle-attempts"],
  });

  const isLoading = statsLoading || attemptsLoading;

  // Calculate recent performance (last 10 attempts)
  const recentAttempts = attempts?.slice(-10) || [];
  const recentSuccessRate = recentAttempts.length > 0
    ? (recentAttempts.filter(a => a.solved === 1).length / recentAttempts.length) * 100
    : 0;

  // Group attempts by day
  const attemptsByDay = attempts?.reduce((acc, attempt) => {
    const date = new Date(attempt.attemptedAt).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = { total: 0, solved: 0 };
    }
    acc[date].total++;
    if (attempt.solved === 1) {
      acc[date].solved++;
    }
    return acc;
  }, {} as Record<string, { total: number; solved: number }>);

  const dailyStats = Object.entries(attemptsByDay || {}).slice(-7); // Last 7 days

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Loading statistics...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-7 w-7 text-primary" />
              <h1 className="text-2xl font-bold" data-testid="text-stats-title">
                Your Progress
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <Link href="/puzzles">
                <Button variant="outline" data-testid="button-back-to-puzzles">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Puzzles
                </Button>
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Overview Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <Target className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Attempts</p>
                  <p className="text-2xl font-bold" data-testid="text-total-attempts">
                    {stats?.totalAttempts || 0}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg">
                  <Trophy className="w-6 h-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Puzzles Solved</p>
                  <p className="text-2xl font-bold text-green-500" data-testid="text-total-solved">
                    {stats?.totalSolved || 0}
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Success Rate</p>
                  <p className="text-2xl font-bold text-blue-500" data-testid="text-success-rate">
                    {stats?.successRate?.toFixed(1) || 0}%
                  </p>
                </div>
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-500/10 rounded-lg">
                  <Clock className="w-6 h-6 text-orange-500" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Time</p>
                  <p className="text-2xl font-bold text-orange-500" data-testid="text-avg-time">
                    {stats?.averageTime?.toFixed(1) || 0}s
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {/* Recent Performance */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Recent Performance</h2>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Last 10 attempts</span>
                <span className="text-lg font-bold">
                  {recentSuccessRate.toFixed(1)}% success rate
                </span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all"
                  style={{ width: `${recentSuccessRate}%` }}
                />
              </div>
            </div>
          </Card>

          {/* Daily Activity */}
          {dailyStats.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Daily Activity (Last 7 Days)</h2>
              <div className="space-y-3">
                {dailyStats.map(([date, data]) => (
                  <div key={date} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{date}</span>
                      <span className="font-medium">
                        {data.solved}/{data.total} solved
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary transition-all"
                        style={{ width: `${(data.solved / data.total) * 100}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Recent Attempts */}
          {recentAttempts.length > 0 && (
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Recent Attempts</h2>
              <div className="space-y-2">
                {recentAttempts.reverse().map((attempt, index) => (
                  <div 
                    key={attempt.id} 
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div className="flex items-center gap-3">
                      {attempt.solved === 1 ? (
                        <div className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                          <Trophy className="w-4 h-4 text-green-500" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center">
                          <Target className="w-4 h-4 text-red-500" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium">
                          Puzzle #{attempt.puzzleId}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(attempt.attemptedAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
                        {attempt.timeSpent}s
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {attempt.solved === 1 ? "Solved" : "Failed"}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* No data message */}
          {(!attempts || attempts.length === 0) && (
            <Card className="p-12 text-center">
              <Trophy className="w-16 h-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-xl font-semibold mb-2">No puzzle attempts yet</h3>
              <p className="text-muted-foreground mb-6">
                Start solving puzzles to track your progress!
              </p>
              <Link href="/puzzles">
                <Button>
                  Start Solving Puzzles
                </Button>
              </Link>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
