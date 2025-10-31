import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { Settings as SettingsIcon, Save } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";

export default function Settings() {
  const { toast } = useToast();
  const [coachingStyle, setCoachingStyle] = useState("balanced");
  const [difficulty, setDifficulty] = useState(50);
  const [verbosity, setVerbosity] = useState(50);
  const [language, setLanguage] = useState("english");

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("gm_trainer_settings");
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        setCoachingStyle(settings.coachingStyle || "balanced");
        setDifficulty(settings.difficulty || 50);
        setVerbosity(settings.verbosity || 50);
        setLanguage(settings.language || "english");
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    }
  }, []);

  const handleSave = () => {
    localStorage.setItem("gm_trainer_settings", JSON.stringify({
      coachingStyle,
      difficulty,
      verbosity,
      language,
    }));

    toast({
      title: "Settings Saved",
      description: "Your coaching preferences will be applied to future analysis",
    });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <SettingsIcon className="h-7 w-7 text-primary" />
              <h1 className="text-2xl font-bold" data-testid="text-settings-title">
                Settings
              </h1>
            </div>
            
            <div className="flex items-center gap-4">
              <Link href="/">
                <Button variant="outline" data-testid="button-back-to-trainer">
                  Back to Trainer
                </Button>
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 p-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Coaching Style */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Coaching Style</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Choose how your AI coach analyzes and explains moves
            </p>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="coaching-style">Style</Label>
                <Select value={coachingStyle} onValueChange={setCoachingStyle}>
                  <SelectTrigger id="coaching-style" data-testid="select-coaching-style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aggressive">Aggressive - Focus on attacking play</SelectItem>
                    <SelectItem value="positional">Positional - Emphasize structure and planning</SelectItem>
                    <SelectItem value="tactical">Tactical - Highlight combinations and tactics</SelectItem>
                    <SelectItem value="balanced">Balanced - Mixed approach</SelectItem>
                    <SelectItem value="defensive">Defensive - Solid and safe play</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {/* Analysis Depth */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Analysis Depth</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Control the complexity of chess analysis and hints
            </p>
            
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Difficulty Level</Label>
                  <span className="text-sm font-medium">{difficulty}%</span>
                </div>
                <Slider
                  value={[difficulty]}
                  onValueChange={([value]) => setDifficulty(value)}
                  min={0}
                  max={100}
                  step={10}
                  data-testid="slider-difficulty"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Beginner</span>
                  <span>Advanced</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Verbosity</Label>
                  <span className="text-sm font-medium">{verbosity}%</span>
                </div>
                <Slider
                  value={[verbosity]}
                  onValueChange={([value]) => setVerbosity(value)}
                  min={0}
                  max={100}
                  step={10}
                  data-testid="slider-verbosity"
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>Concise</span>
                  <span>Detailed</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Language */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Language</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Choose your preferred language for voice coaching
            </p>
            
            <div>
              <Label htmlFor="language">Language</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger id="language" data-testid="select-language">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="english">English</SelectItem>
                  <SelectItem value="spanish">Spanish (Español)</SelectItem>
                  <SelectItem value="french">French (Français)</SelectItem>
                  <SelectItem value="german">German (Deutsch)</SelectItem>
                  <SelectItem value="russian">Russian (Русский)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button onClick={handleSave} size="lg" data-testid="button-save-settings">
              <Save className="w-4 h-4 mr-2" />
              Save Settings
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
