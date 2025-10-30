import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Game } from "@shared/schema";
import { Calendar, MapPin, Trophy } from "lucide-react";

interface GameInfoProps {
  game: Game | null;
}

export function GameInfo({ game }: GameInfoProps) {
  if (!game) {
    return (
      <Card>
        <CardContent className="py-8">
          <p className="text-center text-muted-foreground" data-testid="text-no-game">
            No game loaded. Click "Load Game" to begin your training session.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Game Information</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Players */}
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-white border border-gray-400" />
              <span className="font-semibold" data-testid="text-white-player">{game.white}</span>
            </div>
          </div>
          <div className="text-center text-xs text-muted-foreground">vs</div>
          <div className="flex items-center justify-between p-3 rounded-md bg-muted/50">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-gray-900 border border-gray-600" />
              <span className="font-semibold" data-testid="text-black-player">{game.black}</span>
            </div>
          </div>
        </div>

        {/* Game metadata */}
        <div className="space-y-2 pt-2 border-t">
          {game.result && (
            <div className="flex items-center gap-2 text-sm">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Result:</span>
              <span className="font-medium" data-testid="text-result">{game.result}</span>
            </div>
          )}
          
          {game.date && (
            <div className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Date:</span>
              <span className="font-medium" data-testid="text-date">{game.date}</span>
            </div>
          )}
          
          {game.event && (
            <div className="flex items-center gap-2 text-sm">
              <Trophy className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Event:</span>
              <span className="font-medium" data-testid="text-event">{game.event}</span>
            </div>
          )}
          
          {game.site && (
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Site:</span>
              <span className="font-medium" data-testid="text-site">{game.site}</span>
            </div>
          )}
          
          {game.opening && (
            <div className="pt-2 border-t">
              <div className="text-xs text-muted-foreground mb-1">Opening</div>
              <div className="font-medium text-sm" data-testid="text-opening">{game.opening}</div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
