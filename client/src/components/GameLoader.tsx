import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, Link as LinkIcon, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface GameLoaderProps {
  onGameLoad: (lichessUrl: string, type: "url" | "username") => void;
  isLoading?: boolean;
}

export function GameLoader({ onGameLoad, isLoading = false }: GameLoaderProps) {
  const [open, setOpen] = useState(false);
  const [lichessUrl, setLichessUrl] = useState("");
  const [username, setUsername] = useState("");
  const { toast } = useToast();

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!lichessUrl.trim()) {
      toast({
        title: "URL Required",
        description: "Please enter a valid Lichess game URL",
        variant: "destructive",
      });
      return;
    }
    onGameLoad(lichessUrl, "url");
    setOpen(false);
    setLichessUrl("");
  };

  const handleUsernameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) {
      toast({
        title: "Username Required",
        description: "Please enter a Lichess username",
        variant: "destructive",
      });
      return;
    }
    onGameLoad(username, "username");
    setOpen(false);
    setUsername("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          size="default" 
          className="gap-2"
          data-testid="button-load-game"
        >
          <Download className="h-4 w-4" />
          Load Game
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-game-loader">
        <DialogHeader>
          <DialogTitle className="text-2xl">Import Chess Game</DialogTitle>
          <DialogDescription>
            Load a game from Lichess to start your training session
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="url" className="w-full mt-4">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="url" data-testid="tab-url">
              <LinkIcon className="h-4 w-4 mr-2" />
              Game URL
            </TabsTrigger>
            <TabsTrigger value="username" data-testid="tab-username">
              <User className="h-4 w-4 mr-2" />
              Username
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="url" className="space-y-4 mt-6">
            <form onSubmit={handleUrlSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="lichess-url">Lichess Game URL</Label>
                <Input
                  id="lichess-url"
                  data-testid="input-lichess-url"
                  placeholder="https://lichess.org/xxxxx"
                  value={lichessUrl}
                  onChange={(e) => setLichessUrl(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-sm text-muted-foreground">
                  Paste the URL of any Lichess game
                </p>
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                data-testid="button-import-url"
              >
                {isLoading ? "Loading..." : "Import Game"}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="username" className="space-y-4 mt-6">
            <form onSubmit={handleUsernameSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="username">Lichess Username</Label>
                <Input
                  id="username"
                  data-testid="input-username"
                  placeholder="Enter username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  disabled={isLoading}
                />
                <p className="text-sm text-muted-foreground">
                  Import the most recent game from this player
                </p>
              </div>
              <Button 
                type="submit" 
                className="w-full" 
                disabled={isLoading}
                data-testid="button-import-username"
              >
                {isLoading ? "Loading..." : "Import Game"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
