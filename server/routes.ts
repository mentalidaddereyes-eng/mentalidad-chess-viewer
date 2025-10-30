import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fetchGameByUrl, fetchGamesByUsername, parsePgnMetadata } from "./lib/lichess";
import { analyzeMove, answerQuestion } from "./lib/openai";
import { textToSpeech } from "./lib/elevenlabs";
import { randomUUID } from "crypto";

export async function registerRoutes(app: Express): Promise<Server> {
  // Import game from Lichess
  app.post("/api/games/import", async (req, res) => {
    try {
      const { type, value } = req.body;
      
      if (!type || !value) {
        return res.status(400).json({ error: "Missing type or value" });
      }

      let pgn: string;
      
      if (type === "url") {
        pgn = await fetchGameByUrl(value);
      } else if (type === "username") {
        pgn = await fetchGamesByUsername(value);
      } else {
        return res.status(400).json({ error: "Invalid type. Use 'url' or 'username'" });
      }

      // Parse metadata from PGN
      const metadata = parsePgnMetadata(pgn);
      
      // Create and store game
      const game = await storage.createGame({
        pgn,
        ...metadata,
      });

      res.json(game);
    } catch (error: any) {
      console.error("Game import error:", error);
      res.status(500).json({ error: error.message || "Failed to import game" });
    }
  });

  // Analyze a specific move
  app.post("/api/analysis/move", async (req, res) => {
    try {
      const { moveNumber, move, fen } = req.body;
      
      if (!moveNumber || !move || !fen) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Get AI analysis
      const analysis = await analyzeMove(moveNumber, move, fen, []);
      
      // Generate audio for the analysis
      let audioUrl;
      try {
        const audioBuffer = await textToSpeech(analysis.analysis);
        
        // In a production app, you'd save this to object storage
        // For now, we'll convert to base64 data URL
        const base64Audio = audioBuffer.toString('base64');
        audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
      } catch (audioError) {
        console.error("Audio generation error:", audioError);
        // Continue without audio if it fails
      }

      res.json({
        moveNumber,
        move,
        fen,
        ...analysis,
        audioUrl,
      });
    } catch (error: any) {
      console.error("Move analysis error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze move" });
    }
  });

  // Answer a voice question
  app.post("/api/voice/ask", async (req, res) => {
    try {
      const { question, context } = req.body;
      
      if (!question || !context) {
        return res.status(400).json({ error: "Missing question or context" });
      }

      // Get AI answer
      const answer = await answerQuestion(question, context);
      
      // Generate audio for the answer
      let audioUrl;
      try {
        const audioBuffer = await textToSpeech(answer);
        const base64Audio = audioBuffer.toString('base64');
        audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
      } catch (audioError) {
        console.error("Audio generation error:", audioError);
      }

      res.json({
        answer,
        audioUrl,
      });
    } catch (error: any) {
      console.error("Voice question error:", error);
      res.status(500).json({ error: error.message || "Failed to answer question" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
