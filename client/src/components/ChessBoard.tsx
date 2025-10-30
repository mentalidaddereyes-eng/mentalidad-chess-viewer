import { useState, useEffect } from "react";

interface ChessBoardProps {
  fen: string;
  orientation?: "white" | "black";
  lastMove?: { from: string; to: string } | null;
  onSquareClick?: (square: string) => void;
  className?: string;
}

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];

const pieceUnicode: Record<string, string> = {
  "K": "♔", "Q": "♕", "R": "♖", "B": "♗", "N": "♘", "P": "♙",
  "k": "♚", "q": "♛", "r": "♜", "b": "♝", "n": "♞", "p": "♟"
};

function parseFen(fen: string): Map<string, string> {
  const board = new Map<string, string>();
  const position = fen.split(" ")[0];
  const rows = position.split("/");
  
  rows.forEach((row, rankIndex) => {
    let fileIndex = 0;
    for (const char of row) {
      if (char >= "1" && char <= "8") {
        fileIndex += parseInt(char);
      } else {
        const square = `${files[fileIndex]}${ranks[rankIndex]}`;
        board.set(square, char);
        fileIndex++;
      }
    }
  });
  
  return board;
}

export function ChessBoard({ 
  fen, 
  orientation = "white", 
  lastMove = null,
  onSquareClick,
  className = ""
}: ChessBoardProps) {
  const [board, setBoard] = useState<Map<string, string>>(new Map());
  
  useEffect(() => {
    setBoard(parseFen(fen));
  }, [fen]);
  
  const displayRanks = orientation === "white" ? ranks : [...ranks].reverse();
  const displayFiles = orientation === "white" ? files : [...files].reverse();
  
  const isLastMoveSquare = (square: string) => {
    if (!lastMove) return false;
    return square === lastMove.from || square === lastMove.to;
  };
  
  const isLightSquare = (file: string, rank: string) => {
    const fileIndex = files.indexOf(file);
    const rankIndex = ranks.indexOf(rank);
    return (fileIndex + rankIndex) % 2 === 0;
  };
  
  return (
    <div className={`relative ${className}`} data-testid="chess-board">
      {/* Board container with aspect ratio */}
      <div className="relative w-full" style={{ paddingBottom: "100%" }}>
        <div className="absolute inset-0 rounded-md overflow-hidden border border-border shadow-lg">
          {/* Chess squares */}
          <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
            {displayRanks.map((rank) =>
              displayFiles.map((file) => {
                const square = `${file}${rank}`;
                const piece = board.get(square);
                const isLight = isLightSquare(file, rank);
                const isHighlighted = isLastMoveSquare(square);
                
                return (
                  <div
                    key={square}
                    data-testid={`square-${square}`}
                    className={`
                      relative flex items-center justify-center cursor-pointer
                      transition-colors duration-150
                      ${isLight 
                        ? "bg-[#f0d9b5] dark:bg-[#b58863]" 
                        : "bg-[#b58863] dark:bg-[#8b6f47]"
                      }
                      ${isHighlighted 
                        ? "after:absolute after:inset-0 after:bg-primary/20" 
                        : ""
                      }
                      hover:after:absolute hover:after:inset-0 hover:after:bg-foreground/5
                    `}
                    onClick={() => onSquareClick?.(square)}
                  >
                    {/* Coordinate labels */}
                    {file === displayFiles[0] && (
                      <div className="absolute top-0.5 left-0.5 text-[10px] font-semibold select-none opacity-70"
                           style={{ color: isLight ? "#b58863" : "#f0d9b5" }}>
                        {rank}
                      </div>
                    )}
                    {rank === displayRanks[displayRanks.length - 1] && (
                      <div className="absolute bottom-0.5 right-0.5 text-[10px] font-semibold select-none opacity-70"
                           style={{ color: isLight ? "#b58863" : "#f0d9b5" }}>
                        {file}
                      </div>
                    )}
                    
                    {/* Chess piece */}
                    {piece && (
                      <div 
                        className={`
                          text-5xl md:text-6xl lg:text-7xl leading-none select-none
                          transition-transform duration-200
                          ${piece === piece.toUpperCase() 
                            ? "text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]" 
                            : "text-gray-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.3)]"
                          }
                        `}
                        data-testid={`piece-${square}`}
                      >
                        {pieceUnicode[piece]}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
