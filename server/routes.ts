import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { getStore } from "./lib/store-provider"; // HOTFIX v6.1: DB fallback
import { fetchGameByUrl, fetchGamesByUsername, parsePgnMetadata } from "./lib/lichess";
import { analyzeMove, answerQuestion } from "./lib/openai";
import { generateSpeech, getTTSProvider } from "./lib/tts-provider"; // Cost Saver Pack v6.0
import { getStockfishEvaluation } from "./lib/stockfish";
import { randomUUID } from "crypto";
import { z } from "zod";
import { insertPuzzleSchema, insertPuzzleAttemptSchema } from "@shared/schema";
import type { PlanMode, VoiceProvider } from "@shared/types"; // Cost Saver Pack v6.0
import fs from "fs"; // HOTFIX v6.2.2: For loading sample puzzles
import path from "path"; // HOTFIX v6.2.2: For file paths

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

      // Determine plan for this analysis (feat/subscriptions)
      const planMode: PlanMode = (req.query.plan as PlanMode) || 'free';
      const engineDepths = {
        free: parseInt(process.env.ENGINE_DEPTH_FREE || '14', 10),
        pro: parseInt(process.env.ENGINE_DEPTH_PRO || '20', 10),
        elite: parseInt(process.env.ENGINE_DEPTH_ELITE || '24', 10),
      };
      const engineDepth = engineDepths[planMode] || engineDepths.free;

      // Try to get engine evaluation first (used for context in GPT commentary)
      let engineEval: { score?: number; mate?: number; bestMove?: string } | undefined;
      try {
        engineEval = await Promise.race([
          getStockfishEvaluation(fen, engineDepth), // Plan-aware depth (feat/subscriptions)
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error("Stockfish timeout")), 12000)
          )
        ]);
        console.log(`[coach] Stockfish eval (depth ${engineDepth}, plan ${planMode}):`, engineEval);
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
          // Cost Saver Pack v6.0: Use plan-aware TTS provider
          const planMode: PlanMode = (req.query.plan as PlanMode) || 'free';
          const provider = getTTSProvider(planMode);
          
          const audioBuffer = await generateSpeech(comment.text, {
            provider,
            language: (settings?.language as any) || 'spanish',
            voiceMode: voiceMode || 'pro',
          });
          
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
      
      // Generate audio for the answer (only if not muted) - Cost Saver Pack v6.0: plan-aware TTS
      let audioUrl;
      if (!muted) {
        try {
          // Cost Saver Pack v6.0: Use plan-aware TTS provider
          const planMode: PlanMode = (req.query.plan as PlanMode) || 'free';
          const provider = getTTSProvider(planMode);
          
          const audioBuffer = await generateSpeech(answer, {
            provider,
            language: (settings?.language as any) || 'spanish',
            voiceMode: voiceMode || 'pro',
          });
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
          // Cost Saver Pack v6.0: Use plan-aware TTS provider
          const planMode: PlanMode = (req.query.plan as PlanMode) || 'free';
          const provider = getTTSProvider(planMode);
          
          const audioBuffer = await generateSpeech(comment.text, {
            provider,
            language: (settings?.language as any) || 'spanish',
            voiceMode: voiceMode || 'pro',
          });
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

  // Get user settings (HOTFIX v6.1: DB fallback, no 500)
  app.get("/api/settings", async (req, res) => {
    try {
      const { store, provider } = await getStore();
      console.log('[settings] GET provider=', provider);
      
      const settings = await store.getSettings();
      
      // Return default settings if none exist
      if (!settings) {
        return res.json({
          coachingStyle: "balanced",
          difficulty: 50,
          verbosity: 50,
          language: "spanish", // HOTFIX v6.1: Spanish default
        });
      }
      
      res.json(settings);
    } catch (error: any) {
      console.error("[settings] GET error:", error);
      // HOTFIX v6.1: Return 200 with defaults instead of 500
      res.status(200).json({
        coachingStyle: "balanced",
        difficulty: 50,
        verbosity: 50,
        language: "spanish",
      });
    }
  });

  // Update user settings (HOTFIX v6.1: DB fallback, no 500)
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
      
      const { store, provider } = await getStore();
      console.log('[settings] PUT provider=', provider, 'language=', language);
      
      const settings = await store.updateSettings({
        coachingStyle,
        difficulty,
        verbosity,
        language,
      });
      
      res.json(settings);
    } catch (error: any) {
      console.error("[settings] PUT error:", error);
      // HOTFIX v6.1: Return 200 with the request data instead of 500
      res.status(200).json(req.body);
    }
  });

  // Get all puzzles (with optional filters) - HOTFIX v6.2.2: DB fallback
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
      
      const { store, provider } = await getStore();
      console.log('[puzzles] GET provider=', provider);
      const puzzles = await store.getAllPuzzles(filters);
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

  // Seed sample puzzles - HOTFIX v6.2.2: Load from attached_assets, DB fallback
  app.post("/api/puzzles/seed", async (req, res) => {
    try {
      // Load puzzles from attached_assets/puzzles.sample.json
      const puzzlesPath = path.join(process.cwd(), 'attached_assets', 'puzzles.sample.json');
      let samplePuzzles: any[] = [];
      
      try {
        const fileContent = await fs.promises.readFile(puzzlesPath, 'utf-8');
        samplePuzzles = JSON.parse(fileContent);
        console.log('[puzzles] loaded', samplePuzzles.length, 'sample puzzles from file');
      } catch (fileError) {
        console.warn('[puzzles] sample file not found, using fallback hardcoded puzzles');
        // Fallback to minimal hardcoded puzzles if file doesn't exist
        samplePuzzles = [
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
        ];
      }

      const { store, provider } = await getStore();
      console.log('[puzzles] seed provider=', provider);

      const createdPuzzles = [];
      for (const puzzle of samplePuzzles) {
        const created = await store.createPuzzle(puzzle);
        createdPuzzles.push(created);
      }

      res.json({ 
        message: `Seeded ${createdPuzzles.length} puzzles (provider: ${provider})`, 
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
        depth: z.coerce.number().int().min(1).max(24).default(15),
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

  //
  // Lightweight subscription + trial endpoints (feat/subscriptions)
  //
  const TRIAL_STORE_PATH = path.join(process.cwd(), 'attached_assets', 'trial-store.json');
  const USAGE_STORE_PATH = path.join(process.cwd(), 'attached_assets', 'usage-store.json');

  async function readJsonFileSafe(p: string) {
    try {
      const raw = await fs.promises.readFile(p, 'utf-8');
      return JSON.parse(raw);
    } catch (e) {
      return {};
    }
  }

  async function writeJsonFileSafe(p: string, data: any) {
    try {
      await fs.promises.mkdir(path.dirname(p), { recursive: true });
      await fs.promises.writeFile(p, JSON.stringify(data, null, 2), 'utf-8');
    } catch (e) {
      console.warn('[subscriptions] failed to persist file', p, e);
    }
  }

  function getClientId(req: any) {
    // Prefer authenticated user id if present (future); fallback to IP
    const userId = (req as any).user?.id;
    if (userId) return `user:${userId}`;
    // Express provides req.ip (may include ::ffff:), normalize
    return `ip:${req.ip || req.socket?.remoteAddress || 'anon'}`;
  }

  function getTodayKey() {
    const tz = process.env.TZ || 'America/Chicago';
    return new Date().toLocaleDateString('en-CA', { timeZone: tz }); // YYYY-MM-DD (en-CA)
  }

  // Concurrent analysis tracking (in-memory)
  const concurrentMap = new Map<string, number>();

  // Helper to increment telemetry
  async function incrementUsage(clientId: string, fields: Partial<{ stockfishCalls: number; llmCalls: number; ttsSeconds: number; }>) {
    const usage = await readJsonFileSafe(USAGE_STORE_PATH);
    const day = getTodayKey();
    usage[day] = usage[day] || {};
    usage[day][clientId] = usage[day][clientId] || { stockfishCalls: 0, llmCalls: 0, ttsSeconds: 0 };
    const rec = usage[day][clientId];
    if (fields.stockfishCalls) rec.stockfishCalls += fields.stockfishCalls;
    if (fields.llmCalls) rec.llmCalls += fields.llmCalls;
    if (fields.ttsSeconds) rec.ttsSeconds += fields.ttsSeconds;
    await writeJsonFileSafe(USAGE_STORE_PATH, usage);
  }

  // GET /api/plan -> returns plan + trial eligibility
  app.get("/api/plan", async (req, res) => {
    try {
      const planQuery = (req.query.plan as string) || process.env.DEFAULT_PLAN || 'FREE';
      const plan = String(planQuery).toLowerCase() === 'pro' ? 'pro' : (String(planQuery).toLowerCase() === 'elite' ? 'elite' : 'free');

      const tz = process.env.TZ || 'America/Chicago';
      const today = getTodayKey();

      const store = await readJsonFileSafe(TRIAL_STORE_PATH);
      const clientId = getClientId(req);
      const entry = store[clientId] || { date: null, used: false, usedAt: null, usedDurationMs: 0 };

      const trialEnabled = (process.env.TRIAL_ENABLED || 'true') === 'true';
      const trialDurationMin = parseInt(process.env.TRIAL_DURATION_MIN || '3', 10);

      let eligible = false;
      let remainingMs = 0;
      let usedToday = false;

      if (!trialEnabled) {
        eligible = false;
        usedToday = !!(entry.date === today && entry.used);
      } else {
        if (entry.date !== today || !entry.used) {
          eligible = true;
          usedToday = false;
        } else {
          usedToday = true;
          // compute remaining if within duration
          const usedAt = entry.usedAt ? new Date(entry.usedAt).getTime() : 0;
          const elapsed = Date.now() - usedAt;
          const allowedMs = (trialDurationMin || 3) * 60 * 1000;
          remainingMs = Math.max(0, allowedMs - elapsed);
          if (remainingMs > 0) eligible = true;
          else eligible = false;
        }
      }

      res.json({
        plan,
        trial: {
          eligible,
          remainingMs,
          usedToday,
        },
      });
    } catch (error: any) {
      console.error("[subscriptions] GET /api/plan error:", error);
      res.status(500).json({ error: "Failed to fetch plan" });
    }
  });

  // Simple usage endpoint
  app.get("/api/usage/today", async (req, res) => {
    try {
      const usage = await readJsonFileSafe(USAGE_STORE_PATH);
      const day = getTodayKey();
      res.json({ day, usage: usage[day] || {} });
    } catch (error: any) {
      console.error("[subscriptions] GET /api/usage error:", error);
      res.status(500).json({ error: "Failed to fetch usage" });
    }
  });

  // POST /api/analyze -> Select model/depth based on plan, support FREE trial one PRO analysis/day
  app.post("/api/analyze", async (req, res) => {
    const body = req.body || {};
    const fen = body.fen;
    if (!fen) {
      return res.status(400).json({ error: "Missing FEN" });
    }

    // Determine client / plan
    const planQuery = (req.query.plan as string) || process.env.DEFAULT_PLAN || 'FREE';
    const plan = String(planQuery).toLowerCase() === 'pro' ? 'pro' : (String(planQuery).toLowerCase() === 'elite' ? 'elite' : 'free');

    const clientId = getClientId(req);
    const today = getTodayKey();

    // Concurrency limits
    const limits = {
      free: parseInt(process.env.MAX_CONCURRENT_ANALYSIS_FREE || '1', 10),
      pro: parseInt(process.env.MAX_CONCURRENT_ANALYSIS_PRO || '2', 10),
      elite: parseInt(process.env.MAX_CONCURRENT_ANALYSIS_ELITE || '3', 10),
    };
    const allowedConcurrent = limits[plan as keyof typeof limits] || 1;
    const currentConcurrent = concurrentMap.get(clientId) || 0;
    if (currentConcurrent >= allowedConcurrent) {
      return res.status(429).json({ error: "Too many concurrent analyses" });
    }

    concurrentMap.set(clientId, currentConcurrent + 1);

    try {
      // Read trial store
      const store = await readJsonFileSafe(TRIAL_STORE_PATH);
      // entry shape: { date: YYYY-MM-DD, used: boolean, usedAt: ISOString, usedCount: number }
      const entry = store[clientId] || { date: null, used: false, usedAt: null, usedCount: 0 };

      const trialEnabled = (process.env.TRIAL_ENABLED || 'true') === 'true';
      const trialDurationMin = parseInt(process.env.TRIAL_DURATION_MIN || '3', 10);
      const trialModel = process.env.TRIAL_MODEL || process.env.MODEL_PRO || 'gemini-2.5-flash';
      const trialDepth = parseInt(process.env.TRIAL_ENGINE_DEPTH || String(process.env.ENGINE_DEPTH_PRO || '22'), 10);

      const engineDepths = {
        free: parseInt(process.env.ENGINE_DEPTH_FREE || '14', 10),
        pro: parseInt(process.env.ENGINE_DEPTH_PRO || '20', 10),
        elite: parseInt(process.env.ENGINE_DEPTH_ELITE || '24', 10),
      };

      // Decide requested depth: body.depth or plan default
      const requestedDepth = body.depth ? Number(body.depth) : engineDepths[plan as keyof typeof engineDepths];
      const isProDepthRequested = requestedDepth > engineDepths.free;

      // Check trial eligibility for FREE requesting PRO depth
      // RULE: FREE users get at most ONE PRO analysis per day (trial). Duration window also exists,
      // but the trial is consumed by a single PRO analysis (3 minutes or 1 analysis, whichever first).
      let usingTrial = false;
      if (plan === 'free' && trialEnabled && isProDepthRequested) {
        if (entry.date !== today || !entry.used) {
          // Not used today -> allow ONE trial analysis
          usingTrial = true;
        } else {
          // Already consumed trial today -> deny immediately
          return res.status(402).json({ reason: "TRIAL_ENDED", message: "Trial used for today. Upgrade to PRO to continue." });
        }
      }

      // Select model and depth
      let model = process.env.MODEL_FREE || 'gemini-2.5-flash-lite';
      let depth = engineDepths.free;

      if (plan === 'pro') {
        model = process.env.MODEL_PRO || model;
        depth = engineDepths.pro;
      } else if (plan === 'elite') {
        model = process.env.MODEL_ELITE || model;
        depth = engineDepths.elite;
      }

      if (usingTrial) {
        model = trialModel;
        depth = trialDepth;
      } else if (body.model) {
        model = body.model;
      }
      // If body.depth explicitly provided, override (but still subject to trial checks)
      if (body.depth) {
        depth = Number(body.depth);
      }

      // Telemetry: note one stockfish call
      await incrementUsage(clientId, { stockfishCalls: 1 });

      // Perform the engine evaluation (use existing helper)
      const evaluation = await getStockfishEvaluation(fen, depth);

      // If using trial, mark trial as used (store usedAt and increment usedCount)
      if (usingTrial) {
        const prev = store[clientId] || {};
        store[clientId] = { 
          date: today, 
          used: true, 
          usedAt: new Date().toISOString(),
          usedCount: (prev.usedCount ? Number(prev.usedCount) + 1 : 1)
        };
        await writeJsonFileSafe(TRIAL_STORE_PATH, store);
      }

      res.json({
        plan,
        model,
        depth,
        evaluation,
        trialUsed: !!usingTrial,
      });
    } catch (error: any) {
      console.error("[subscriptions] POST /api/analyze error:", error);
      res.status(500).json({ error: "Analyze failed" });
    } finally {
      // decrement concurrent
      const now = concurrentMap.get(clientId) || 1;
      concurrentMap.set(clientId, Math.max(0, now - 1));
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
