import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Download, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PositionEditorProps {
  open: boolean;
  onClose: () => void;
  onLoadPosition: (fen: string) => void;
  initialFen?: string;
}

const files = ["a", "b", "c", "d", "e", "f", "g", "h"];
const ranks = ["8", "7", "6", "5", "4", "3", "2", "1"];

const pieceUnicode: Record<string, string> = {
  "K": "♔", "Q": "♕", "R": "♖", "B": "♗", "N": "♘", "P": "♙",
  "k": "♚", "q": "♛", "r": "♜", "b": "♝", "n": "♞", "p": "♟"
};

const allPieces = ["K", "Q", "R", "B", "N", "P", "k", "q", "r", "b", "n", "p"];

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

function boardToFen(
  board: Map<string, string>,
  turn: string,
  castling: { wk: boolean; wq: boolean; bk: boolean; bq: boolean },
  enPassant: string
): string {
  let fen = "";
  
  for (let r = 0; r < 8; r++) {
    let emptyCount = 0;
    for (let f = 0; f < 8; f++) {
      const square = `${files[f]}${ranks[r]}`;
      const piece = board.get(square);
      
      if (piece) {
        if (emptyCount > 0) {
          fen += emptyCount;
          emptyCount = 0;
        }
        fen += piece;
      } else {
        emptyCount++;
      }
    }
    
    if (emptyCount > 0) {
      fen += emptyCount;
    }
    
    if (r < 7) fen += "/";
  }
  
  fen += ` ${turn}`;
  
  let castlingStr = "";
  if (castling.wk) castlingStr += "K";
  if (castling.wq) castlingStr += "Q";
  if (castling.bk) castlingStr += "k";
  if (castling.bq) castlingStr += "q";
  if (castlingStr === "") castlingStr = "-";
  fen += ` ${castlingStr}`;
  
  fen += ` ${enPassant || "-"}`;
  fen += " 0 1";
  
  return fen;
}

export function PositionEditor({ open, onClose, onLoadPosition, initialFen }: PositionEditorProps) {
  const { toast } = useToast();
  const [board, setBoard] = useState<Map<string, string>>(new Map());
  const [selectedPiece, setSelectedPiece] = useState<string | null>("K");
  const [turn, setTurn] = useState<string>("w");
  const [castling, setCastling] = useState({ wk: true, wq: true, bk: true, bq: true });
  const [enPassant, setEnPassant] = useState<string>("-");
  const [draggedPiece, setDraggedPiece] = useState<{ piece: string; from?: string } | null>(null);

  useEffect(() => {
    if (initialFen) {
      const parsedBoard = parseFen(initialFen);
      setBoard(parsedBoard);
      
      const parts = initialFen.split(" ");
      if (parts[1]) setTurn(parts[1]);
      if (parts[2]) {
        const c = parts[2];
        setCastling({
          wk: c.includes("K"),
          wq: c.includes("Q"),
          bk: c.includes("k"),
          bq: c.includes("q")
        });
      }
      if (parts[3]) setEnPassant(parts[3]);
    } else {
      setBoard(parseFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"));
    }
  }, [initialFen, open]);

  const handleSquareClick = (square: string) => {
    if (selectedPiece) {
      const newBoard = new Map(board);
      if (selectedPiece === "trash") {
        newBoard.delete(square);
      } else {
        newBoard.set(square, selectedPiece);
      }
      setBoard(newBoard);
    }
  };

  const handleDragStart = (piece: string, from?: string) => {
    setDraggedPiece({ piece, from });
  };

  const handleDrop = (square: string) => {
    if (!draggedPiece) return;
    
    const newBoard = new Map(board);
    if (draggedPiece.from) {
      newBoard.delete(draggedPiece.from);
    }
    newBoard.set(square, draggedPiece.piece);
    setBoard(newBoard);
    setDraggedPiece(null);
  };

  const handleClearBoard = () => {
    setBoard(new Map());
  };

  const handleResetBoard = () => {
    setBoard(parseFen("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1"));
    setTurn("w");
    setCastling({ wk: true, wq: true, bk: true, bq: true });
    setEnPassant("-");
  };

  const getCurrentFen = () => {
    return boardToFen(board, turn, castling, enPassant);
  };


  const handleSaveFavorite = () => {
    const fen = getCurrentFen();
    const favorites = JSON.parse(localStorage.getItem("fenFavorites") || "[]");
    favorites.push({ fen, date: new Date().toISOString() });
    localStorage.setItem("fenFavorites", JSON.stringify(favorites));
    toast({ title: "Favorita guardada", description: "Posición guardada en favoritas" });
  };

  const handleLoadToBoard = () => {
    const fen = getCurrentFen();
    onLoadPosition(fen);
    onClose();
  };

  const isLightSquare = (file: string, rank: string) => {
    const fileIndex = files.indexOf(file);
    const rankIndex = ranks.indexOf(rank);
    return (fileIndex + rankIndex) % 2 === 0;
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editor de Posiciones</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Board */}
          <div className="lg:col-span-2">
            <div className="relative w-full" style={{ paddingBottom: "100%" }}>
              <div className="absolute inset-0 rounded-md overflow-hidden border border-border">
                <div className="grid grid-cols-8 grid-rows-8 w-full h-full">
                  {ranks.map((rank) =>
                    files.map((file) => {
                      const square = `${file}${rank}`;
                      const piece = board.get(square);
                      const isLight = isLightSquare(file, rank);
                      
                      return (
                        <div
                          key={square}
                          data-testid={`editor-square-${square}`}
                          className={`
                            relative flex items-center justify-center cursor-pointer
                            ${isLight 
                              ? "bg-[#f0d9b5] dark:bg-[#b58863]" 
                              : "bg-[#b58863] dark:bg-[#8b6f47]"
                            }
                            hover:after:absolute hover:after:inset-0 hover:after:bg-foreground/10
                          `}
                          onClick={() => handleSquareClick(square)}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={() => handleDrop(square)}
                        >
                          {piece && (
                            <div 
                              className={`
                                text-4xl md:text-5xl leading-none select-none cursor-move
                                ${piece === piece.toUpperCase() 
                                  ? "text-white drop-shadow-[0_2px_2px_rgba(0,0,0,0.5)]" 
                                  : "text-gray-900 drop-shadow-[0_1px_1px_rgba(255,255,255,0.3)]"
                                }
                              `}
                              draggable
                              onDragStart={() => handleDragStart(piece, square)}
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

          {/* Controls */}
          <div className="space-y-4">
            {/* Piece Palette */}
            <div>
              <Label>Seleccionar pieza</Label>
              <div className="grid grid-cols-6 gap-2 mt-2">
                {allPieces.map((piece) => (
                  <button
                    key={piece}
                    data-testid={`piece-palette-${piece}`}
                    className={`
                      aspect-square flex items-center justify-center rounded-md border-2
                      ${selectedPiece === piece 
                        ? "border-primary bg-primary/10" 
                        : "border-border hover-elevate"
                      }
                    `}
                    onClick={() => setSelectedPiece(piece)}
                    draggable
                    onDragStart={() => handleDragStart(piece)}
                  >
                    <span className={`text-2xl ${piece === piece.toUpperCase() ? "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.5)]" : "text-gray-900"}`}>
                      {pieceUnicode[piece]}
                    </span>
                  </button>
                ))}
                <button
                  data-testid="piece-palette-trash"
                  aria-label="Eliminar pieza"
                  title="Eliminar pieza"
                  className={`
                    aspect-square flex items-center justify-center rounded-md border-2
                    ${selectedPiece === "trash" 
                      ? "border-destructive bg-destructive/10" 
                      : "border-border hover-elevate"
                    }
                  `}
                  onClick={() => setSelectedPiece("trash")}
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Turn */}
            <div>
              <Label>Turno</Label>
              <Select value={turn} onValueChange={setTurn}>
                <SelectTrigger data-testid="select-turn">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="w">Blancas</SelectItem>
                  <SelectItem value="b">Negras</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Castling */}
            <div>
              <Label>Enroque disponible</Label>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="wk" 
                    checked={castling.wk}
                    onCheckedChange={(checked) => setCastling({ ...castling, wk: !!checked })}
                    data-testid="castling-wk"
                  />
                  <Label htmlFor="wk" className="text-sm">O-O (B)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="wq" 
                    checked={castling.wq}
                    onCheckedChange={(checked) => setCastling({ ...castling, wq: !!checked })}
                    data-testid="castling-wq"
                  />
                  <Label htmlFor="wq" className="text-sm">O-O-O (B)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="bk" 
                    checked={castling.bk}
                    onCheckedChange={(checked) => setCastling({ ...castling, bk: !!checked })}
                    data-testid="castling-bk"
                  />
                  <Label htmlFor="bk" className="text-sm">O-O (N)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="bq" 
                    checked={castling.bq}
                    onCheckedChange={(checked) => setCastling({ ...castling, bq: !!checked })}
                    data-testid="castling-bq"
                  />
                  <Label htmlFor="bq" className="text-sm">O-O-O (N)</Label>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-2">
              <Button 
                onClick={handleLoadToBoard} 
                className="w-full"
                data-testid="editor-apply"
              >
                <Download className="w-4 h-4 mr-2" />
                Cargar en tablero
              </Button>
              <Button 
                onClick={handleSaveFavorite} 
                variant="outline" 
                className="w-full"
                data-testid="editor-save"
              >
                Guardar Favorita
              </Button>
            </div>

            {/* Board Actions */}
            <div className="space-y-2 pt-4 border-t">
              <Button 
                onClick={handleResetBoard} 
                variant="secondary" 
                size="sm"
                className="w-full"
              >
                Posición inicial
              </Button>
              <Button 
                onClick={handleClearBoard} 
                variant="secondary" 
                size="sm"
                className="w-full"
              >
                Limpiar tablero
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
