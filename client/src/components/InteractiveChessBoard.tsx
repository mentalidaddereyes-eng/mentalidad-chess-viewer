import { useState, useEffect } from "react";
import { Chess } from "chess.js";

interface InteractiveChessBoardProps {
  fen: string;
  orientation?: "white" | "black";
  onMove?: (move: { from: string; to: string; promotion?: string }) => boolean;
  showLegalMoves?: boolean;
  disabled?: boolean;
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

export function InteractiveChessBoard({ 
  fen, 
  orientation = "white", 
  onMove,
  showLegalMoves = true,
  disabled = false,
  className = ""
}: InteractiveChessBoardProps) {
  const [board, setBoard] = useState<Map<string, string>>(new Map());
  const [chess] = useState(() => new Chess());
  const [selectedSquare, setSelectedSquare] = useState<string | null>(null);
  const [legalMoves, setLegalMoves] = useState<string[]>([]);
  const [draggedSquare, setDraggedSquare] = useState<string | null>(null);
  
  useEffect(() => {
    try {
      chess.load(fen);
      setBoard(parseFen(fen));
      setSelectedSquare(null);
      setLegalMoves([]);
    } catch (error) {
      console.error("Failed to load FEN:", error);
    }
  }, [fen, chess]);
  
  const displayRanks = orientation === "white" ? ranks : [...ranks].reverse();
  const displayFiles = orientation === "white" ? files : [...files].reverse();
  
  const getLegalMovesForSquare = (square: string): string[] => {
    try {
      const moves = chess.moves({ square: square as any, verbose: true });
      return moves.map((m: any) => m.to);
    } catch {
      return [];
    }
  };
  
  const handleSquareClick = (square: string) => {
    if (disabled) return;
    
    const piece = board.get(square);
    
    // If there's a selected square
    if (selectedSquare) {
      // Try to make a move
      if (legalMoves.includes(square)) {
        const move = { from: selectedSquare, to: square };
        const success = onMove?.(move) ?? false;
        
        if (success) {
          setSelectedSquare(null);
          setLegalMoves([]);
        }
      } else {
        // Select new piece if clicking on own piece
        if (piece) {
          const moves = getLegalMovesForSquare(square);
          setSelectedSquare(square);
          setLegalMoves(moves);
        } else {
          setSelectedSquare(null);
          setLegalMoves([]);
        }
      }
    } else {
      // Select a piece
      if (piece) {
        const moves = getLegalMovesForSquare(square);
        setSelectedSquare(square);
        setLegalMoves(moves);
      }
    }
  };
  
  const handleDragStart = (square: string, e: React.DragEvent) => {
    if (disabled) {
      e.preventDefault();
      return;
    }
    
    const piece = board.get(square);
    if (!piece) {
      e.preventDefault();
      return;
    }
    
    setDraggedSquare(square);
    const moves = getLegalMovesForSquare(square);
    setLegalMoves(moves);
    
    // Set drag image
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", square);
  };
  
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };
  
  const handleDrop = (targetSquare: string, e: React.DragEvent) => {
    e.preventDefault();
    
    if (!draggedSquare || disabled) return;
    
    if (legalMoves.includes(targetSquare)) {
      const move = { from: draggedSquare, to: targetSquare };
      onMove?.(move);
    }
    
    setDraggedSquare(null);
    setLegalMoves([]);
  };
  
  const handleDragEnd = () => {
    setDraggedSquare(null);
    setLegalMoves([]);
  };
  
  const isLightSquare = (file: string, rank: string) => {
    const fileIndex = files.indexOf(file);
    const rankIndex = ranks.indexOf(rank);
    return (fileIndex + rankIndex) % 2 === 0;
  };
  
  return (
    <div className={`relative ${className}`} data-testid="interactive-chess-board">
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
                const isSelected = square === selectedSquare;
                const isLegalMove = legalMoves.includes(square);
                const isDragging = square === draggedSquare;
                
                return (
                  <div
                    key={square}
                    data-testid={`square-${square}`}
                    className={`
                      relative flex items-center justify-center
                      transition-colors duration-150
                      ${isLight 
                        ? "bg-[#f0d9b5] dark:bg-[#b58863]" 
                        : "bg-[#b58863] dark:bg-[#8b6f47]"
                      }
                      ${isSelected 
                        ? "after:absolute after:inset-0 after:bg-primary/40 after:ring-2 after:ring-primary" 
                        : ""
                      }
                      ${!disabled && piece ? "cursor-grab active:cursor-grabbing" : ""}
                      ${!disabled && isLegalMove ? "cursor-pointer" : ""}
                    `}
                    onClick={() => handleSquareClick(square)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(square, e)}
                  >
                    {/* Coordinate labels */}
                    {file === displayFiles[0] && (
                      <div className="absolute top-0.5 left-0.5 text-[10px] font-semibold select-none opacity-70 z-10"
                           style={{ color: isLight ? "#b58863" : "#f0d9b5" }}>
                        {rank}
                      </div>
                    )}
                    {rank === displayRanks[displayRanks.length - 1] && (
                      <div className="absolute bottom-0.5 right-0.5 text-[10px] font-semibold select-none opacity-70 z-10"
                           style={{ color: isLight ? "#b58863" : "#f0d9b5" }}>
                        {file}
                      </div>
                    )}
                    
                    {/* Legal move indicator */}
                    {showLegalMoves && isLegalMove && !piece && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-3 h-3 rounded-full bg-primary/40" />
                      </div>
                    )}
                    
                    {showLegalMoves && isLegalMove && piece && (
                      <div className="absolute inset-0 pointer-events-none">
                        <div className="absolute inset-0 rounded-full border-4 border-primary/40" 
                             style={{ margin: "8%" }} />
                      </div>
                    )}
                    
                    {/* Chess piece */}
                    {piece && (
                      <div 
                        className={`
                          text-5xl md:text-6xl lg:text-7xl leading-none
                          transition-transform duration-200
                          ${piece === piece.toUpperCase() 
                            ? "text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]" 
                            : "text-gray-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.3)]"
                          }
                          ${isDragging ? "opacity-50" : ""}
                          ${!disabled ? "select-none" : ""}
                        `}
                        data-testid={`piece-${square}`}
                        draggable={!disabled}
                        onDragStart={(e) => handleDragStart(square, e)}
                        onDragEnd={handleDragEnd}
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
