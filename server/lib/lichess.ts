// Lichess API client for fetching games

interface LichessGame {
  id: string;
  players: {
    white: { user?: { name: string }; rating?: number };
    black: { user?: { name: string }; rating?: number };
  };
  pgn: string;
  moves?: string;
  clock?: any;
  opening?: { name: string };
  createdAt: number;
  status: string;
  winner?: string;
}

export async function fetchGameByUrl(gameUrl: string): Promise<string> {
  // Extract game ID from URL
  const gameIdMatch = gameUrl.match(/lichess\.org\/([a-zA-Z0-9]{8})/);
  if (!gameIdMatch) {
    throw new Error("Invalid Lichess URL format");
  }
  
  const gameId = gameIdMatch[1];
  const response = await fetch(`https://lichess.org/game/export/${gameId}`, {
    headers: {
      "Accept": "application/x-chess-pgn",
    },
  });
  
  if (!response.ok) {
    throw new Error("Failed to fetch game from Lichess");
  }
  
  return await response.text();
}

export async function fetchGamesByUsername(username: string, max: number = 1): Promise<string> {
  const response = await fetch(
    `https://lichess.org/api/games/user/${username}?max=${max}&pgnInJson=true`,
    {
      headers: {
        "Accept": "application/x-ndjson",
      },
    }
  );
  
  if (!response.ok) {
    throw new Error("Failed to fetch games for user");
  }
  
  const text = await response.text();
  const games = text.trim().split("\n").filter(line => line.trim());
  
  if (games.length === 0) {
    throw new Error("No games found for this user");
  }
  
  console.log('[games] fetched from username:', games.length, 'games');
  
  // If multiple games requested, combine all PGNs
  if (max > 1) {
    const pgns: string[] = [];
    for (const gameJson of games) {
      const gameData: LichessGame = JSON.parse(gameJson);
      if (gameData.pgn) {
        pgns.push(gameData.pgn);
      }
    }
    
    // Join multiple PGN games with double newline separator
    return pgns.join('\n\n');
  }
  
  // Parse the first game (most recent) - now it's JSON with pgn field
  const gameData: LichessGame = JSON.parse(games[0]);
  
  // Return the PGN directly from the JSON response
  if (gameData.pgn) {
    return gameData.pgn;
  }
  
  // Fallback: fetch the PGN for this specific game if not included
  return await fetchGameByUrl(`https://lichess.org/${gameData.id}`);
}

// Split a multi-game PGN into individual games
export function splitPgn(pgn: string): string[] {
  // Split by double newline (separator between games)
  const rawGames = pgn.split(/\n\n\[Event/).filter(g => g.trim());
  
  // Re-add [Event to all but first
  return rawGames.map((game, index) => {
    if (index === 0) return game;
    return `[Event${game}`;
  });
}

export function parsePgnMetadata(pgn: string): {
  white: string;
  black: string;
  result?: string;
  date?: string;
  event?: string;
  site?: string;
  opening?: string;
} {
  const lines = pgn.split("\n");
  const metadata: any = {};
  
  for (const line of lines) {
    if (line.startsWith("[")) {
      const match = line.match(/\[(\w+)\s+"(.+)"\]/);
      if (match) {
        const [, key, value] = match;
        metadata[key.toLowerCase()] = value;
      }
    }
  }
  
  return {
    white: metadata.white || "White",
    black: metadata.black || "Black",
    result: metadata.result,
    date: metadata.date,
    event: metadata.event,
    site: metadata.site,
    opening: metadata.opening,
  };
}
