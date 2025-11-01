import { useState, useEffect, useRef } from "react";
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

// Touch tolerance in pixels for distinguishing tap from drag
const TOUCH_TOLERANCE = 14;

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
  
  // Touch interaction state
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);
  const touchStartSquare = useRef<string | null>(null);
  const isDragging = useRef(false);
  
  // Promotion dialog state
  const [showPromotionDialog, setShowPromotionDialog] = useState(false);
  const [pendingMove, setPendingMove] = useState<{ from: string; to: string } | null>(null);
  
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
  
  const isPromotion = (from: string, to: string): boolean => {
    const piece = board.get(from);
    if (!piece || (piece.toLowerCase() !== 'p')) return false;
    
    // Check if pawn is moving to last rank
    const toRank = to[1];
    return (piece === 'P' && toRank === '8') || (piece === 'p' && toRank === '1');
  };
  
  const executeMove = (from: string, to: string, promotion?: string) => {
    const move = { from, to, promotion };
    const success = onMove?.(move) ?? false;
    
    if (success) {
      setSelectedSquare(null);
      setLegalMoves([]);
      setShowPromotionDialog(false);
      setPendingMove(null);
    }
    
    return success;
  };
  
  const handlePromotionChoice = (piece: string) => {
    if (pendingMove) {
      executeMove(pendingMove.from, pendingMove.to, piece);
    }
  };
  
  const handleSquareClick = (square: string) => {
    if (disabled) return;
    
    const piece = board.get(square);
    
    // If there's a selected square
    if (selectedSquare) {
      // Try to make a move
      if (legalMoves.includes(square)) {
        // Check if this is a promotion
        if (isPromotion(selectedSquare, square)) {
          setPendingMove({ from: selectedSquare, to: square });
          setShowPromotionDialog(true);
        } else {
          executeMove(selectedSquare, square);
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
      // Check if this is a promotion
      if (isPromotion(draggedSquare, targetSquare)) {
        setPendingMove({ from: draggedSquare, to: targetSquare });
        setShowPromotionDialog(true);
        setDraggedSquare(null);
      } else {
        const move = { from: draggedSquare, to: targetSquare };
        onMove?.(move);
        setDraggedSquare(null);
        setLegalMoves([]);
      }
    } else {
      setDraggedSquare(null);
      setLegalMoves([]);
    }
  };
  
  const handleDragEnd = () => {
    setDraggedSquare(null);
    setLegalMoves([]);
  };
  
  // Touch event handlers for mobile
  const handleTouchStart = (square: string, e: React.TouchEvent) => {
    if (disabled) return;
    
    const piece = board.get(square);
    if (!piece) return;
    
    // Check if this piece belongs to the current player
    const isWhitePiece = piece === piece.toUpperCase();
    const isCurrentPlayerPiece = (chess.turn() === 'w' && isWhitePiece) || 
                                  (chess.turn() === 'b' && !isWhitePiece);
    
    // If there's already a selected square and user touches an enemy piece,
    // don't start a new touch - let handleTouchEnd handle it as a capture
    if (selectedSquare && !isCurrentPlayerPiece) {
      return;
    }
    
    e.preventDefault(); // Prevent scrolling when touching pieces
    
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    touchStartSquare.current = square;
    isDragging.current = false;
    
    // Show legal moves immediately
    const moves = getLegalMovesForSquare(square);
    setLegalMoves(moves);
    
    // Clear selectedSquare when starting a new touch/drag to avoid conflicts
    // The touch/drag will use touchStartSquare as the source
    if (selectedSquare !== square) {
      setSelectedSquare(null);
    }
    
    console.log('[ui] touch start on', square, 'piece:', piece);
  };
  
  const handleTouchMove = (e: React.TouchEvent) => {
    if (disabled || !touchStartPos.current || !touchStartSquare.current) return;
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.clientX - touchStartPos.current.x);
    const deltaY = Math.abs(touch.clientY - touchStartPos.current.y);
    
    // If moved beyond tolerance, it's a drag
    if (deltaX > TOUCH_TOLERANCE || deltaY > TOUCH_TOLERANCE) {
      isDragging.current = true;
      setDraggedSquare(touchStartSquare.current);
      e.preventDefault(); // Prevent scrolling during drag
    }
  };
  
  const handleTouchEnd = (targetSquare: string, e: React.TouchEvent) => {
    if (disabled) return;
    
    // Handle tap-to-move capture: if there's a selectedSquare, this is a legal move,
    // AND we're not in drag mode (to avoid conflicts when dragging after selecting)
    if (selectedSquare && legalMoves.includes(targetSquare) && !isDragging.current && !touchStartSquare.current) {
      console.log('[ui] tap-to-move capture from', selectedSquare, 'to', targetSquare);
      // Check if this is a promotion
      if (isPromotion(selectedSquare, targetSquare)) {
        setPendingMove({ from: selectedSquare, to: targetSquare });
        setShowPromotionDialog(true);
        console.log('[ui] promotion dialog shown (tap-to-move capture)');
      } else {
        executeMove(selectedSquare, targetSquare);
        console.log('[ui] tap-to-move capture executed');
      }
      return;
    }
    
    // Handle drag or initial tap
    if (!touchStartSquare.current) return;
    
    const fromSquare = touchStartSquare.current;
    
    // If it was a drag, try to make the move
    if (isDragging.current) {
      console.log('[ui] drag detected from', fromSquare, 'to', targetSquare);
      if (legalMoves.includes(targetSquare)) {
        // Check if this is a promotion
        if (isPromotion(fromSquare, targetSquare)) {
          setPendingMove({ from: fromSquare, to: targetSquare });
          setShowPromotionDialog(true);
          console.log('[ui] promotion dialog shown');
        } else {
          const move = { from: fromSquare, to: targetSquare };
          onMove?.(move);
          console.log('[ui] drag move executed:', move);
        }
      }
      
      setDraggedSquare(null);
      setLegalMoves([]);
    } else {
      // It was a tap - handle like click for tap-to-move
      console.log('[ui] tap detected on', targetSquare, 'from', fromSquare);
      if (fromSquare === targetSquare) {
        // Tapped the same square - select it
        const moves = getLegalMovesForSquare(fromSquare);
        setSelectedSquare(fromSquare);
        setLegalMoves(moves);
        console.log('[ui] piece selected, legal moves:', moves.length);
      } else if (legalMoves.includes(targetSquare)) {
        // Tapped a different legal move square - execute move
        // Check if this is a promotion
        if (isPromotion(fromSquare, targetSquare)) {
          setPendingMove({ from: fromSquare, to: targetSquare });
          setShowPromotionDialog(true);
          console.log('[ui] promotion dialog shown (tap-to-move)');
        } else {
          executeMove(fromSquare, targetSquare);
          console.log('[ui] tap-to-move executed');
        }
      }
    }
    
    // Reset touch state
    touchStartPos.current = null;
    touchStartSquare.current = null;
    isDragging.current = false;
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
          <div className="grid grid-cols-8 grid-rows-8 w-full h-full" data-testid="board-canvas">
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
                    onTouchEnd={(e) => {
                      // Handle taps on empty squares for tap-to-move
                      if (!piece && selectedSquare && legalMoves.includes(square)) {
                        // Check if this is a promotion
                        if (isPromotion(selectedSquare, square)) {
                          setPendingMove({ from: selectedSquare, to: square });
                          setShowPromotionDialog(true);
                        } else {
                          executeMove(selectedSquare, square);
                        }
                      }
                    }}
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
                        onTouchStart={(e) => handleTouchStart(square, e)}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={(e) => handleTouchEnd(square, e)}
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
      
      {/* Promotion Dialog - Large and touch-friendly for mobile */}
      {showPromotionDialog && (
        <div 
          className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          data-testid="promotion-dialog"
        >
          <div className="bg-card border-2 border-primary rounded-lg p-6 md:p-8 shadow-2xl max-w-md mx-4">
            <h3 className="text-xl md:text-2xl font-bold text-center mb-6">
              Choose Promotion Piece
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => handlePromotionChoice('q')}
                className="flex flex-col items-center justify-center gap-3 p-6 md:p-8 
                         bg-background hover-elevate active-elevate-2 rounded-lg border-2 border-border
                         transition-all min-h-[88px] md:min-h-[100px]"
                data-testid="button-promote-queen"
              >
                <span className="text-6xl md:text-7xl">♕</span>
                <span className="text-base md:text-lg font-semibold">Queen</span>
              </button>
              <button
                onClick={() => handlePromotionChoice('r')}
                className="flex flex-col items-center justify-center gap-3 p-6 md:p-8 
                         bg-background hover-elevate active-elevate-2 rounded-lg border-2 border-border
                         transition-all min-h-[88px] md:min-h-[100px]"
                data-testid="button-promote-rook"
              >
                <span className="text-6xl md:text-7xl">♖</span>
                <span className="text-base md:text-lg font-semibold">Rook</span>
              </button>
              <button
                onClick={() => handlePromotionChoice('b')}
                className="flex flex-col items-center justify-center gap-3 p-6 md:p-8 
                         bg-background hover-elevate active-elevate-2 rounded-lg border-2 border-border
                         transition-all min-h-[88px] md:min-h-[100px]"
                data-testid="button-promote-bishop"
              >
                <span className="text-6xl md:text-7xl">♗</span>
                <span className="text-base md:text-lg font-semibold">Bishop</span>
              </button>
              <button
                onClick={() => handlePromotionChoice('n')}
                className="flex flex-col items-center justify-center gap-3 p-6 md:p-8 
                         bg-background hover-elevate active-elevate-2 rounded-lg border-2 border-border
                         transition-all min-h-[88px] md:min-h-[100px]"
                data-testid="button-promote-knight"
              >
                <span className="text-6xl md:text-7xl">♘</span>
                <span className="text-base md:text-lg font-semibold">Knight</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
