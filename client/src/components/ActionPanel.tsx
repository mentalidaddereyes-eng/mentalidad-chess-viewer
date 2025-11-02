import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { 
  RotateCcw, 
  Upload, 
  FlipVertical,
  Undo2,
  Redo2,
  Play,
  Pause,
  Download,
  Settings,
  Swords,
  Home,
  Edit3
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface ActionPanelProps {
  isPlayVsCoach: boolean;
  playerColor: "white" | "black";
  isAutoPlaying: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onNewGame: () => void;
  onImport: () => void; // Hotfix v5.1.1: Single Import button (auto-detects PGN/FEN)
  onOpenEditor: () => void; // v7.0: Position Editor
  onFlipBoard: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onToggleAutoPlay: () => void;
  onExportPgn: () => void;
  onSettings: () => void;
  onTogglePlayVsCoach: () => void;
  onPlayerColorChange: (color: "white" | "black") => void;
}

export function ActionPanel({
  isPlayVsCoach,
  playerColor,
  isAutoPlaying,
  canUndo,
  canRedo,
  onNewGame,
  onImport, // Hotfix v5.1.1: Single Import callback
  onOpenEditor, // v7.0: Position Editor
  onFlipBoard,
  onUndo,
  onRedo,
  onToggleAutoPlay,
  onExportPgn,
  onSettings,
  onTogglePlayVsCoach,
  onPlayerColorChange,
}: ActionPanelProps) {
  return (
    <Card className="h-full flex flex-col gap-2 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Swords className="h-5 w-5 text-primary" />
        <h2 className="font-semibold text-sm">Actions</h2>
      </div>

      {/* New/Reset */}
      <Button
        variant="outline"
        onClick={onNewGame}
        className="w-full justify-start h-9 text-sm"
        data-testid="button-new-game"
      >
        <Home className="w-4 h-4 mr-2" />
        New / Reset
      </Button>

      {/* Hotfix v5.1.1: Single Import button (auto-detects PGN/FEN) */}
      <Button
        variant="outline"
        onClick={onImport}
        className="w-full justify-start h-9 text-sm"
        data-testid="import-button"
      >
        <Upload className="w-4 h-4 mr-2" />
        Import
      </Button>

      {/* v7.0: Position Editor */}
      <Button
        variant="outline"
        onClick={onOpenEditor}
        className="w-full justify-start h-9 text-sm"
        data-testid="editor-open"
      >
        <Edit3 className="w-4 h-4 mr-2" />
        Editor
      </Button>

      <Separator className="my-2" />

      {/* Board Controls */}
      <Button
        variant="outline"
        onClick={onFlipBoard}
        className="w-full justify-start h-9 text-sm"
        data-testid="button-flip-board"
      >
        <FlipVertical className="w-4 h-4 mr-2" />
        Flip Board
      </Button>

      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onUndo}
          disabled={!canUndo}
          className="flex-1 h-9 text-sm"
          data-testid="button-undo"
        >
          <Undo2 className="w-4 h-4" />
        </Button>
        <Button
          variant="outline"
          onClick={onRedo}
          disabled={!canRedo}
          className="flex-1 h-9 text-sm"
          data-testid="button-redo"
        >
          <Redo2 className="w-4 h-4" />
        </Button>
      </div>

      <Separator className="my-2" />

      {/* Play vs Coach Toggle */}
      <Button
        variant={isPlayVsCoach ? "default" : "outline"}
        onClick={onTogglePlayVsCoach}
        className="w-full justify-start h-9 text-sm"
        data-testid="button-toggle-play-vs-coach"
      >
        <Swords className="w-4 h-4 mr-2" />
        Play vs Coach
      </Button>

      {/* Color selector when playing vs coach */}
      {isPlayVsCoach && (
        <div className="flex flex-col gap-2 p-2 bg-muted/30 rounded-md">
          <Label htmlFor="player-color-select" className="text-xs">I play with:</Label>
          <select
            id="player-color-select"
            value={playerColor}
            onChange={(e) => onPlayerColorChange(e.target.value as "white" | "black")}
            className="h-8 text-xs px-2 rounded-md border border-input bg-background hover-elevate"
            data-testid="select-player-color"
          >
            <option value="white">White</option>
            <option value="black">Black</option>
          </select>
        </div>
      )}

      <Separator className="my-2" />

      {/* Auto-play */}
      <Button
        variant="outline"
        onClick={onToggleAutoPlay}
        disabled={isPlayVsCoach}
        className="w-full justify-start h-9 text-sm"
        data-testid="button-toggle-autoplay"
      >
        {isAutoPlaying ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
        {isAutoPlaying ? "Pause" : "Auto-play"}
      </Button>

      {/* Export PGN */}
      <Button
        variant="outline"
        onClick={onExportPgn}
        className="w-full justify-start h-9 text-sm"
        data-testid="button-export-pgn"
      >
        <Download className="w-4 h-4 mr-2" />
        Export PGN
      </Button>

      {/* Settings */}
      <Button
        variant="outline"
        onClick={onSettings}
        className="w-full justify-start h-9 text-sm"
        data-testid="button-settings-panel"
      >
        <Settings className="w-4 h-4 mr-2" />
        Settings
      </Button>
    </Card>
  );
}
