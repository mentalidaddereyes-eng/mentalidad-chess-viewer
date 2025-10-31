import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Calendar, Users, Trophy, ChevronRight, Database } from "lucide-react";
import type { Game } from "@shared/schema";

export default function History() {
  const { data: games, isLoading } = useQuery<Game[]>({
    queryKey: ["/api/games"],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-width-7xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold">Game History</h1>
            <Link href="/">
              <Button variant="outline" data-testid="button-back-to-trainer">
                Back to Trainer
              </Button>
            </Link>
          </div>
          <div className="text-center text-muted-foreground py-12">
            Loading games...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold" data-testid="text-page-title">Game History</h1>
            <p className="text-muted-foreground mt-1">
              View all your analyzed chess games
            </p>
          </div>
          <Link href="/">
            <Button variant="outline" data-testid="button-back-to-trainer">
              Back to Trainer
            </Button>
          </Link>
        </div>

        {!games || games.length === 0 ? (
          <Card className="p-12">
            <div className="text-center">
              <Database className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2" data-testid="text-no-games">
                No games yet
              </h3>
              <p className="text-muted-foreground mb-6">
                Import your first game from Lichess to start analyzing
              </p>
              <Link href="/">
                <Button data-testid="button-import-first-game">
                  Import Your First Game
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="grid gap-4">
            {games.map((game) => (
              <Card
                key={game.id}
                className="p-6 hover-elevate"
                data-testid={`card-game-${game.id}`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-4 mb-3">
                      <div className="flex items-center gap-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="font-semibold" data-testid={`text-white-${game.id}`}>
                          {game.white}
                        </span>
                        <span className="text-muted-foreground">vs</span>
                        <span className="font-semibold" data-testid={`text-black-${game.id}`}>
                          {game.black}
                        </span>
                      </div>
                      {game.result && (
                        <div className="flex items-center gap-2">
                          <Trophy className="w-4 h-4 text-muted-foreground" />
                          <span
                            className="text-sm text-muted-foreground"
                            data-testid={`text-result-${game.id}`}
                          >
                            {game.result}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      {game.event && (
                        <div>
                          <span className="text-muted-foreground">Event: </span>
                          <span data-testid={`text-event-${game.id}`}>
                            {game.event}
                          </span>
                        </div>
                      )}
                      {game.date && (
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-muted-foreground" />
                          <span data-testid={`text-date-${game.id}`}>
                            {game.date}
                          </span>
                        </div>
                      )}
                      {game.opening && (
                        <div className="col-span-2">
                          <span className="text-muted-foreground">Opening: </span>
                          <span data-testid={`text-opening-${game.id}`}>
                            {game.opening}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <Link href={`/?gameId=${game.id}`}>
                    <Button
                      variant="ghost"
                      size="icon"
                      data-testid={`button-view-game-${game.id}`}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
