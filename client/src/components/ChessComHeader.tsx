import { Trophy, Volume2, VolumeX, History, Target, Settings, Crown } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { GameLoader } from "@/components/GameLoader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface ChessComHeaderProps {
  voiceMode: "pro" | "kids";
  muted: boolean;
  onToggleMute: () => void;
  onVoiceModeChange: (mode: "pro" | "kids") => void;
  onGameLoad: (value: string, type: "url" | "username") => void;
  isLoading?: boolean;
}

export function ChessComHeader({
  voiceMode,
  muted,
  onToggleMute,
  onVoiceModeChange,
  onGameLoad,
  isLoading = false,
}: ChessComHeaderProps) {
  return (
    <header className="border-b bg-card sticky top-0 z-50">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 gap-4">
          <div className="flex items-center gap-3">
            <Trophy className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold hidden sm:block" data-testid="text-app-title">
              GM Trainer
            </h1>
          </div>
          
          <div className="flex items-center gap-2 md:gap-3">
            {/* Voice Mode Selector - Pro/Kids */}
            <ToggleGroup
              type="single"
              value={voiceMode}
              onValueChange={(value) => {
                if (value === "pro" || value === "kids") {
                  onVoiceModeChange(value);
                }
              }}
              className="border rounded-md"
              data-testid="toggle-voice-mode"
            >
              <ToggleGroupItem
                value="pro"
                aria-label="Professional mode"
                className="text-xs px-2 py-1 h-8"
                data-testid="toggle-voice-pro"
              >
                Pro
              </ToggleGroupItem>
              <ToggleGroupItem
                value="kids"
                aria-label="Kids mode"
                className="text-xs px-2 py-1 h-8"
                data-testid="toggle-voice-kids"
              >
                Niño
              </ToggleGroupItem>
            </ToggleGroup>

            {/* Voice Mute Toggle */}
            <Button
              variant={muted ? "outline" : "default"}
              size="icon"
              onClick={onToggleMute}
              className="h-8 w-8"
              data-testid="button-toggle-mute"
              title={muted ? "Unmute voice coach" : "Mute voice coach"}
            >
              {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            </Button>
            
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-2">
              <Link href="/history">
                <Button variant="ghost" size="sm" className="h-8" data-testid="button-view-history">
                  <History className="w-4 h-4 mr-1" />
                  <span className="hidden lg:inline">History</span>
                </Button>
              </Link>
              <Link href="/puzzles">
                <Button variant="ghost" size="sm" className="h-8" data-testid="button-view-puzzles">
                  <Target className="w-4 h-4 mr-1" />
                  <span className="hidden lg:inline">Puzzles</span>
                </Button>
              </Link>
              <Link href="/settings">
                <Button variant="ghost" size="sm" className="h-8" data-testid="button-view-settings">
                  <Settings className="w-4 h-4 mr-1" />
                  <span className="hidden lg:inline">Settings</span>
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="h-8"
                data-testid="button-upgrade-plan"
                onClick={() => {
                  if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
                    window.dispatchEvent(new CustomEvent("open-upgrade-modal"));
                  } else {
                    // fallback navigation
                    window.location.href = "/upgrade";
                  }
                }}
              >
                <Crown className="w-4 h-4 mr-1" />
                <span className="hidden lg:inline">Mejorar Plan</span>
              </Button>
              <GameLoader 
                onGameLoad={onGameLoad}
                isLoading={isLoading}
              />
            </div>
            
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}
