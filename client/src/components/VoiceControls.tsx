import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Mic, MicOff, Loader2 } from "lucide-react";

interface VoiceControlsProps {
  onAskQuestion: (question: string) => void;
  isProcessing: boolean;
  lastQuestion?: string;
  disabled?: boolean;
}

export function VoiceControls({ 
  onAskQuestion, 
  isProcessing,
  lastQuestion,
  disabled = false 
}: VoiceControlsProps) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recognition, setRecognition] = useState<SpeechRecognition | null>(null);

  const startListening = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      alert("Voice recognition is not supported in your browser. Please use Chrome or Edge.");
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognitionInstance = new SpeechRecognition();
    
    recognitionInstance.continuous = false;
    recognitionInstance.interimResults = true;
    recognitionInstance.lang = "en-US";

    recognitionInstance.onstart = () => {
      setIsListening(true);
      setTranscript("");
    };

    recognitionInstance.onresult = (event: any) => {
      const current = event.resultIndex;
      const transcriptText = event.results[current][0].transcript;
      setTranscript(transcriptText);
      
      if (event.results[current].isFinal) {
        onAskQuestion(transcriptText);
        setIsListening(false);
      }
    };

    recognitionInstance.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error);
      setIsListening(false);
    };

    recognitionInstance.onend = () => {
      setIsListening(false);
    };

    setRecognition(recognitionInstance);
    recognitionInstance.start();
  };

  const stopListening = () => {
    if (recognition) {
      recognition.stop();
      setIsListening(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="text-lg flex items-center gap-2">
          <Mic className="h-5 w-5" />
          Ask Your Coach
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Voice button */}
        <div className="flex flex-col items-center gap-4">
          <Button
            size="lg"
            variant={isListening ? "destructive" : "default"}
            className="w-full h-16 text-base gap-2"
            onClick={isListening ? stopListening : startListening}
            disabled={disabled || isProcessing}
            data-testid="button-voice"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Processing...
              </>
            ) : isListening ? (
              <>
                <MicOff className="h-5 w-5" />
                Stop Listening
              </>
            ) : (
              <>
                <Mic className="h-5 w-5" />
                Ask a Question
              </>
            )}
          </Button>
          
          {/* Status badges */}
          <div className="flex gap-2 flex-wrap justify-center">
            {isListening && (
              <Badge variant="default" className="animate-pulse" data-testid="badge-listening">
                Listening...
              </Badge>
            )}
            {isProcessing && (
              <Badge variant="secondary" data-testid="badge-processing">
                Processing
              </Badge>
            )}
          </div>
        </div>
        
        {/* Transcript display */}
        {(transcript || lastQuestion) && (
          <div className="p-4 rounded-md bg-muted/50 border">
            <div className="text-xs text-muted-foreground mb-1">
              {isListening ? "You're saying:" : "Last question:"}
            </div>
            <p className="text-sm" data-testid="text-transcript">
              {transcript || lastQuestion}
            </p>
          </div>
        )}
        
        {/* Instructions */}
        <div className="text-xs text-muted-foreground text-center">
          Click the microphone button and ask questions about the position, moves, or strategy
        </div>
      </CardContent>
    </Card>
  );
}
