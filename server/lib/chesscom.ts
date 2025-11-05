//
// Chess.com PGN fetch helper
//
export async function fetchPgnByChessComUrl(rawUrl: string): Promise<string> {
  const url = rawUrl.trim();
  const candidates: string[] = [];

  try {
    // If it already ends with .pgn, try it directly
    if (url.toLowerCase().endsWith(".pgn")) {
      candidates.push(url);
    } else {
      // Common chess.com game URL forms:
      // https://www.chess.com/game/live/1234567890
      // https://www.chess.com/game/daily/1234567890
      // https://www.chess.com/game/1234567890
      // Fallback: append .pgn to the original
      candidates.push(url + ".pgn");

      const idMatch = url.match(/chess\.com\/game\/(?:live|daily)?\/?(\d+)/i);
      if (idMatch) {
        const gameId = idMatch[1];
        candidates.push(`https://www.chess.com/game/live/${gameId}.pgn`);
        candidates.push(`https://www.chess.com/game/daily/${gameId}.pgn`);
        candidates.push(`https://www.chess.com/game/${gameId}.pgn`);
      }
    }

    let lastError: any = null;
    for (const candidate of candidates) {
      try {
        const res = await fetch(candidate, {
          headers: {
            "Accept": "application/x-chess-pgn,text/plain;q=0.9,*/*;q=0.8",
          },
        });
        if (!res.ok) {
          lastError = new Error(`HTTP ${res.status} for ${candidate}`);
          continue;
        }
        const text = await res.text();
        // Basic PGN check
        if (text.includes("[Event") || text.includes("[Site") || /\d+\.\s*[a-hNBRQKO]/i.test(text)) {
          return text;
        }
        lastError = new Error(`Invalid PGN content from ${candidate}`);
      } catch (err) {
        lastError = err;
        continue;
      }
    }

    throw lastError || new Error("Failed to fetch Chess.com PGN");
  } catch (e: any) {
    throw new Error(e?.message || "Failed to fetch Chess.com PGN");
  }
}
