import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { fetchGameByUrl, fetchGamesByUsername, parsePgnMetadata } from "./lib/lichess";
import { analyzeMove, answerQuestion } from "./lib/openai";
import { textToSpeech } from "./lib/elevenlabs";
import { getStockfishEvaluation } from "./lib/stockfish";
import { randomUUID } from "crypto";
import { z } from "zod";
import { insertPuzzleSchema, insertPuzzleAttemptSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all games
  app.get("/api/games", async (req, res) => {
    try {
      const games = await storage.getAllGames();
      res.json(games);
    } catch (error: any) {
      console.error("Failed to fetch games:", error);
      res.status(500).json({ error: error.message || "Failed to fetch games" });
    }
  });

  // Get a single game by ID
  app.get("/api/games/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid game ID" });
      }
      
      const game = await storage.getGame(id);
      if (!game) {
        return res.status(404).json({ error: "Game not found" });
      }
      
      res.json(game);
    } catch (error: any) {
      console.error("Failed to fetch game:", error);
      res.status(500).json({ error: error.message || "Failed to fetch game" });
    }
  });

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
      const { moveNumber, move, fen, settings } = req.body;
      
      if (!moveNumber || !move || !fen) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Get AI analysis first (required)
      const analysis = await analyzeMove(moveNumber, move, fen, [], settings);
      
      // Try to get engine evaluation (optional, with timeout)
      let engineEval: { score?: number; mate?: number; bestMove?: string } | undefined;
      try {
        engineEval = await Promise.race([
          getStockfishEvaluation(fen, 10), // Depth 10 for reasonable speed
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error("Stockfish timeout")), 12000)
          )
        ]);
        console.log("Stockfish evaluation:", engineEval);
      } catch (engineError) {
        console.log("Stockfish evaluation skipped:", engineError);
        // Continue without engine evaluation
      }
      
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
        score: engineEval?.score,
        mate: engineEval?.mate,
        bestMove: engineEval?.bestMove,
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
      const { question, context, settings } = req.body;
      
      if (!question || !context) {
        return res.status(400).json({ error: "Missing question or context" });
      }

      // Get AI answer
      const answer = await answerQuestion(question, context, settings);
      
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

  // Get user settings
  app.get("/api/settings", async (req, res) => {
    try {
      const settings = await storage.getSettings();
      
      // Return default settings if none exist
      if (!settings) {
        return res.json({
          coachingStyle: "balanced",
          difficulty: 50,
          verbosity: 50,
          language: "english",
        });
      }
      
      res.json(settings);
    } catch (error: any) {
      console.error("Failed to fetch settings:", error);
      res.status(500).json({ error: error.message || "Failed to fetch settings" });
    }
  });

  // Update user settings
  app.put("/api/settings", async (req, res) => {
    try {
      // Validate request body with Zod schema
      const settingsSchema = z.object({
        coachingStyle: z.enum(["aggressive", "positional", "tactical", "balanced", "defensive"]).optional(),
        difficulty: z.number().min(0).max(100).optional(),
        verbosity: z.number().min(0).max(100).optional(),
        language: z.enum(["english", "spanish", "french", "german", "russian"]).optional(),
      });
      
      const validationResult = settingsSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid settings data", 
          details: validationResult.error.errors 
        });
      }
      
      const { coachingStyle, difficulty, verbosity, language } = validationResult.data;
      
      const settings = await storage.updateSettings({
        coachingStyle,
        difficulty,
        verbosity,
        language,
      });
      
      res.json(settings);
    } catch (error: any) {
      console.error("Failed to update settings:", error);
      res.status(500).json({ error: error.message || "Failed to update settings" });
    }
  });

  // Get all puzzles
  app.get("/api/puzzles", async (req, res) => {
    try {
      const puzzles = await storage.getAllPuzzles();
      res.json(puzzles);
    } catch (error: any) {
      console.error("Failed to fetch puzzles:", error);
      res.status(500).json({ error: error.message || "Failed to fetch puzzles" });
    }
  });

  // Get a single puzzle
  app.get("/api/puzzles/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id, 10);
      if (isNaN(id)) {
        return res.status(400).json({ error: "Invalid puzzle ID" });
      }
      
      const puzzle = await storage.getPuzzle(id);
      if (!puzzle) {
        return res.status(404).json({ error: "Puzzle not found" });
      }
      
      res.json(puzzle);
    } catch (error: any) {
      console.error("Failed to fetch puzzle:", error);
      res.status(500).json({ error: error.message || "Failed to fetch puzzle" });
    }
  });

  // Create a puzzle
  app.post("/api/puzzles", async (req, res) => {
    try {
      const validationResult = insertPuzzleSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid puzzle data", 
          details: validationResult.error.errors 
        });
      }
      
      const puzzle = await storage.createPuzzle(validationResult.data);
      res.json(puzzle);
    } catch (error: any) {
      console.error("Failed to create puzzle:", error);
      res.status(500).json({ error: error.message || "Failed to create puzzle" });
    }
  });

  // Record a puzzle attempt
  app.post("/api/puzzles/:id/attempt", async (req, res) => {
    try {
      const puzzleId = parseInt(req.params.id, 10);
      if (isNaN(puzzleId)) {
        return res.status(400).json({ error: "Invalid puzzle ID" });
      }
      
      const attemptSchema = z.object({
        solved: z.number().int().min(0).max(1),
        timeSpent: z.number().int().nonnegative().optional(),
        userId: z.number().int().optional().nullable(),
      });
      
      const validationResult = attemptSchema.safeParse(req.body);
      
      if (!validationResult.success) {
        return res.status(400).json({ 
          error: "Invalid attempt data", 
          details: validationResult.error.errors 
        });
      }
      
      const attempt = await storage.createPuzzleAttempt({
        puzzleId,
        ...validationResult.data,
      });
      
      res.json(attempt);
    } catch (error: any) {
      console.error("Failed to record puzzle attempt:", error);
      res.status(500).json({ error: error.message || "Failed to record attempt" });
    }
  });

  // Seed sample puzzles (for development/testing)
  app.post("/api/puzzles/seed", async (req, res) => {
    try {
      const samplePuzzles = [
        {
          fen: "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1",
          solution: "Ra8#",
          explanation: "Back rank checkmate! The rook delivers mate on the 8th rank.",
          theme: "Back rank mate",
          rating: 800,
          source: "custom",
        },
        {
          fen: "r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1",
          solution: "Nxe5",
          explanation: "The knight captures the undefended pawn on e5, winning material.",
          theme: "Material gain",
          rating: 900,
          source: "custom",
        },
        {
          fen: "r1bqkb1r/pppp1ppp/2n2n2/4p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1",
          solution: "Ng5",
          explanation: "The knight attacks f7, threatening a fork on e6 and h7.",
          theme: "Knight attack",
          rating: 1000,
          source: "custom",
        },
        {
          fen: "rnbqkb1r/pppp1ppp/5n2/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 0 1",
          solution: "Nxe5",
          explanation: "The knight captures the central pawn, establishing control of the center.",
          theme: "Central control",
          rating: 1100,
          source: "custom",
        },
        {
          fen: "r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 0 1",
          solution: "Ng5",
          explanation: "The knight attacks f7, creating a double attack on the weak square.",
          theme: "Double attack",
          rating: 1200,
          source: "custom",
        },
      ];

      const createdPuzzles = [];
      for (const puzzle of samplePuzzles) {
        const created = await storage.createPuzzle(puzzle);
        createdPuzzles.push(created);
      }

      res.json({ 
        message: `Seeded ${createdPuzzles.length} puzzles`, 
        puzzles: createdPuzzles 
      });
    } catch (error: any) {
      console.error("Failed to seed puzzles:", error);
      res.status(500).json({ error: error.message || "Failed to seed puzzles" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
