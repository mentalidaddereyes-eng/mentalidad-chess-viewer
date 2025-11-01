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

  // Analyze a specific move (Fix Pack v5: now uses getGPTComment for pedagogical analysis)
  app.post("/api/analysis/move", async (req, res) => {
    try {
      const { moveNumber, move, fen, settings, voiceMode, muted } = req.body;
      
      if (!moveNumber || !move || !fen) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Try to get engine evaluation first (used for context in GPT commentary)
      let engineEval: { score?: number; mate?: number; bestMove?: string } | undefined;
      try {
        engineEval = await Promise.race([
          getStockfishEvaluation(fen, 10), // Depth 10 for reasonable speed
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error("Stockfish timeout")), 12000)
          )
        ]);
        console.log("[coach] Stockfish eval:", engineEval);
      } catch (engineError) {
        console.log("[coach] Stockfish skipped:", engineError);
        // Continue without engine evaluation
      }
      
      // Get pedagogical GPT commentary (Fix Pack v5)
      const { getGPTComment } = await import("./lib/openai");
      const comment = await getGPTComment({
        fen,
        bestMove: engineEval?.bestMove,
        score: engineEval?.score,
        mate: engineEval?.mate,
        moveHistory: [],
        language: settings?.language || 'english',
        voiceMode: voiceMode || 'pro',
        coachingStyle: settings?.coachingStyle || 'balanced'
      });
      
      // Generate audio for the commentary (only if not muted) - Hotfix v5.1.1: language support
      let audioUrl;
      if (!muted) {
        try {
          const audioBuffer = await textToSpeech(
            comment.text, 
            voiceMode || 'pro',
            settings?.language || 'spanish' // Default Spanish per hotfix v5.1.1
          );
          
          // In a production app, you'd save this to object storage
          // For now, we'll convert to base64 data URL
          const base64Audio = audioBuffer.toString('base64');
          audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
        } catch (audioError) {
          console.error("[coach] Audio generation error:", audioError);
          // Continue without audio if it fails
        }
      }

      res.json({
        moveNumber,
        move,
        fen,
        analysis: comment.text, // Pedagogical commentary without numeric evals
        score: engineEval?.score,
        mate: engineEval?.mate,
        bestMove: engineEval?.bestMove,
        audioUrl,
      });
    } catch (error: any) {
      console.error("[coach] Move analysis error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze move" });
    }
  });

  // Answer a voice question
  app.post("/api/voice/ask", async (req, res) => {
    try {
      const { question, context, settings, voiceMode, muted } = req.body;
      
      if (!question || !context) {
        return res.status(400).json({ error: "Missing question or context" });
      }

      // Get AI answer
      const answer = await answerQuestion(question, context, settings);
      
      // Generate audio for the answer (only if not muted) - Hotfix v5.1.1: language support
      let audioUrl;
      if (!muted) {
        try {
          const audioBuffer = await textToSpeech(
            answer, 
            voiceMode || 'pro',
            settings?.language || 'spanish' // Default Spanish per hotfix v5.1.1
          );
          const base64Audio = audioBuffer.toString('base64');
          audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
        } catch (audioError) {
          console.error("Audio generation error:", audioError);
        }
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

  // Get GPT coach comment (Fix Pack v5)
  app.post("/api/coach/comment", async (req, res) => {
    try {
      const { fen, bestMove, score, mate, moveHistory, settings, voiceMode, muted } = req.body;
      
      if (!fen) {
        return res.status(400).json({ error: "Missing FEN position" });
      }

      // Import getGPTComment function
      const { getGPTComment } = await import("./lib/openai");
      
      // Get pedagogical commentary
      const comment = await getGPTComment({
        fen,
        bestMove,
        score,
        mate,
        moveHistory: moveHistory || [],
        language: settings?.language || 'english',
        voiceMode: voiceMode || 'pro',
        coachingStyle: settings?.coachingStyle || 'balanced'
      });
      
      // Generate audio for the comment (only if not muted) - Hotfix v5.1.1: language support
      let audioUrl;
      if (!muted) {
        try {
          const audioBuffer = await textToSpeech(
            comment.text, 
            voiceMode || 'pro',
            settings?.language || 'spanish' // Default Spanish per hotfix v5.1.1
          );
          const base64Audio = audioBuffer.toString('base64');
          audioUrl = `data:audio/mpeg;base64,${base64Audio}`;
        } catch (audioError) {
          console.error("Audio generation error:", audioError);
        }
      }

      res.json({
        comment: comment.text,
        audioUrl,
      });
    } catch (error: any) {
      console.error("Coach comment error:", error);
      res.status(500).json({ error: error.message || "Failed to generate coach comment" });
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
        language: z.enum(["english", "spanish", "portuguese", "hindi", "french", "german", "russian"]).optional(),
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

  // Get all puzzles (with optional filters)
  app.get("/api/puzzles", async (req, res) => {
    try {
      // Parse and validate query parameters
      let minRating: number | undefined;
      let maxRating: number | undefined;
      let themes: string[] | undefined;
      
      // Parse minRating with strict validation (handle both string and array)
      if (req.query.minRating) {
        const param = req.query.minRating;
        // Reject repeated params for numeric values
        if (Array.isArray(param)) {
          return res.status(400).json({ error: "minRating cannot be specified multiple times" });
        }
        const str = String(param);
        const num = Number(str);
        if (!Number.isFinite(num) || !Number.isInteger(num) || str.trim() !== num.toString()) {
          return res.status(400).json({ error: "Invalid minRating: must be a valid integer" });
        }
        minRating = num;
      }
      
      // Parse maxRating with strict validation (handle both string and array)
      if (req.query.maxRating) {
        const param = req.query.maxRating;
        // Reject repeated params for numeric values
        if (Array.isArray(param)) {
          return res.status(400).json({ error: "maxRating cannot be specified multiple times" });
        }
        const str = String(param);
        const num = Number(str);
        if (!Number.isFinite(num) || !Number.isInteger(num) || str.trim() !== num.toString()) {
          return res.status(400).json({ error: "Invalid maxRating: must be a valid integer" });
        }
        maxRating = num;
      }
      
      // Validate that minRating <= maxRating
      if (minRating !== undefined && maxRating !== undefined && minRating > maxRating) {
        return res.status(400).json({ error: "minRating must be less than or equal to maxRating" });
      }
      
      // Parse and trim themes (handle both string and array formats)
      if (req.query.themes) {
        const themesParam = req.query.themes;
        if (Array.isArray(themesParam)) {
          // Handle repeated query params like ?themes=Fork&themes=Pin
          themes = themesParam
            .flatMap(t => String(t).split(','))
            .map(t => t.trim())
            .filter(Boolean);
        } else if (typeof themesParam === 'string') {
          // Handle comma-separated string like ?themes=Fork,Pin
          themes = themesParam
            .split(',')
            .map(t => t.trim())
            .filter(Boolean);
        } else {
          return res.status(400).json({ error: "Invalid themes parameter format" });
        }
      }
      
      // Build filters object only with valid values
      const filters = (minRating !== undefined || maxRating !== undefined || themes !== undefined) 
        ? { minRating, maxRating, themes }
        : undefined;
      
      const puzzles = await storage.getAllPuzzles(filters);
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

  // Get puzzle statistics
  app.get("/api/stats/puzzles", async (req, res) => {
    try {
      const stats = await storage.getPuzzleStats();
      res.json(stats);
    } catch (error: any) {
      console.error("Failed to fetch puzzle stats:", error);
      res.status(500).json({ error: error.message || "Failed to fetch stats" });
    }
  });

  // Get all puzzle attempts
  app.get("/api/puzzle-attempts", async (req, res) => {
    try {
      const attempts = await storage.getAllPuzzleAttempts();
      res.json(attempts);
    } catch (error: any) {
      console.error("Failed to fetch puzzle attempts:", error);
      res.status(500).json({ error: error.message || "Failed to fetch attempts" });
    }
  });

  // Import daily puzzle from Lichess
  app.post("/api/puzzles/import-daily", async (req, res) => {
    try {
      // Fetch daily puzzle from Lichess
      const response = await fetch("https://lichess.org/api/puzzle/daily");
      if (!response.ok) {
        throw new Error(`Lichess API error: ${response.statusText}`);
      }
      
      const lichessPuzzle = await response.json() as any;
      
      // Parse PGN to get FEN at initial ply
      const { Chess } = await import("chess.js");
      const chess = new Chess();
      
      // Load the complete PGN
      const pgn = lichessPuzzle.game?.pgn || "";
      const initialPly = lichessPuzzle.puzzle?.initialPly || 0;
      
      try {
        // Load the full PGN (strict: false allows some invalid PGN formats)
        chess.loadPgn(pgn, { strict: false });
        
        // Get move history and total moves
        const history = chess.history();
        const totalMoves = history.length;
        
        // Validate that we have enough moves
        if (initialPly > totalMoves) {
          throw new Error(`Initial ply (${initialPly}) exceeds total moves (${totalMoves})`);
        }
        
        // Undo moves to get to the puzzle starting position
        const movesToUndo = totalMoves - initialPly;
        for (let i = 0; i < movesToUndo; i++) {
          chess.undo();
        }
      } catch (error: any) {
        console.error("Failed to parse PGN from Lichess:", error);
        throw new Error(`Cannot parse puzzle PGN: ${error.message}`);
      }
      
      const fen = chess.fen();
      
      // Extract puzzle data
      const puzzle = {
        fen,
        solution: lichessPuzzle.puzzle?.solution?.[0] || "", // First move of solution
        explanation: `Lichess daily puzzle (#${lichessPuzzle.puzzle?.id || "N/A"}). Themes: ${lichessPuzzle.puzzle?.themes?.join(", ") || "Mixed"}`,
        theme: lichessPuzzle.puzzle?.themes?.[0] || "Mixed",
        rating: lichessPuzzle.puzzle?.rating || 1500,
        source: "lichess",
        externalId: lichessPuzzle.puzzle?.id || null,
      };
      
      // Save to database
      const validationResult = insertPuzzleSchema.safeParse(puzzle);
      
      if (!validationResult.success) {
        console.error("Validation failed for puzzle:", puzzle);
        console.error("Validation errors:", validationResult.error.errors);
        return res.status(400).json({ 
          error: "Invalid puzzle data from Lichess", 
          details: validationResult.error.errors 
        });
      }
      
      const savedPuzzle = await storage.createPuzzle(validationResult.data);
      res.json(savedPuzzle);
    } catch (error: any) {
      console.error("Failed to import daily puzzle:", error);
      res.status(500).json({ error: error.message || "Failed to import daily puzzle" });
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

  // Stockfish engine analysis endpoint for Play vs Coach
  app.post("/api/stockfish/analyze", async (req, res) => {
    try {
      // Validate request with Zod schema
      const stockfishRequestSchema = z.object({
        fen: z.string().min(1, "FEN string cannot be empty"),
        depth: z.coerce.number().int().min(1).max(20).default(15),
      });
      
      const validated = stockfishRequestSchema.parse(req.body);
      
      const evaluation = await getStockfishEvaluation(validated.fen, validated.depth);
      res.json(evaluation);
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.errors });
      }
      console.error("Stockfish analysis error:", error);
      res.status(500).json({ error: error.message || "Failed to analyze position" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
